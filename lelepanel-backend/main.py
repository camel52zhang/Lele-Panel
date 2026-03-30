from fastapi import FastAPI, Depends, HTTPException, status, APIRouter
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
# ⚠️ 修复：确保导入了 SQLModel
from sqlmodel import Session, select, SQLModel 
from typing import List, Optional

# 导入安全相关的工具
from passlib.context import CryptContext
from datetime import timedelta, datetime
from jose import jwt, JWTError

# 导入我们在 models.py 中定义的模型和函数
from models import Link, User, create_db_and_tables, get_session, engine

# ----------------------------------------------------------------------
# ⚠️ 优化：将 UserUpdate 移动到 models.py 中，如果决定留在 main.py，
# ⚠️ 请确保它在 models.py 中没有重复定义，否则会有冲突。
# ----------------------------------------------------------------------
# 用于接收前端修改密码请求的数据结构
class UserUpdate(SQLModel):
    old_password: str
    new_password: str
    new_username: Optional[str] = None

# 创建 FastAPI 实例
app = FastAPI()

# -----------------
# 安全配置：JWT 和密码哈希
# -----------------
SECRET_KEY = "your-super-secret-key"  # ⚠️ 生产环境必须更换为复杂密钥!
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")  

# -----------------
# 密码工具函数
# -----------------

def verify_password(plain_password, hashed_password):
    """验证明文密码是否与哈希密码匹配"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """获取密码的哈希值"""
    return pwd_context.hash(password)

# -----------------
# JWT Token 工具函数
# -----------------

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """创建 JWT Token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# -----------------
# CORS 配置
# -----------------
origins = ["*"]  # 允许所有来源，方便本地测试。生产环境请修改！

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------
# 启动事件：创建数据库表 和 初始化管理员
# -----------------
@app.on_event("startup")
def on_startup():
    """在应用启动时执行，确保数据库文件和表结构存在，并创建默认管理员"""
    create_db_and_tables()
    
    admin_username = "admin"
    admin_password = "password" # 默认密码
    
    # 检查是否已存在管理员
    with Session(engine) as session:
        statement = select(User).where(User.username == admin_username)
        user = session.exec(statement).first()
        
        if not user:
            print(f">>> 正在创建默认管理员账户: {admin_username} / {admin_password} <<<")
            hashed_password = get_password_hash(admin_password) 
            new_user = User(username=admin_username, password_hash=hashed_password)
            session.add(new_user)
            session.commit()
            print(">>> 默认管理员账户创建成功。请尽快修改密码! <<<")

# -----------------
# 公开 API：获取所有导航链接
# -----------------
@app.get("/api/links", response_model=List[Link])
def read_links(session: Session = Depends(get_session)):
    """获取所有公开的导航链接数据。"""
    statement = select(Link).where(Link.is_public == True).order_by(Link.sort_order)
    results = session.exec(statement).all()
    return results

# -----------------
# 认证 API
# -----------------
@app.post("/api/login")
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session)
):
    """管理员登录接口，成功后返回访问 Token"""
    statement = select(User).where(User.username == form_data.username)
    user = session.exec(statement).first()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

# -----------------
# 权限依赖函数
# -----------------

def get_current_user(
    session: Session = Depends(get_session), token: str = Depends(oauth2_scheme)
):
    """验证 Token 并返回当前用户对象"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token 无效")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token 已过期或无效")
    
    user = session.exec(select(User).where(User.username == username)).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户不存在")
        
    return user

# -----------------
# 管理 API (需要登录)
# -----------------
admin_router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(get_current_user)]
)

# 1. 新增链接
@admin_router.post("/links", response_model=Link)
def create_link(link: Link, session: Session = Depends(get_session)):
    """新增一个导航链接"""
    session.add(link)
    session.commit()
    session.refresh(link)
    return link

# 2. 修改链接
@admin_router.put("/links/{link_id}", response_model=Link)
def update_link(link_id: int, link: Link, session: Session = Depends(get_session)):
    """修改一个导航链接"""
    db_link = session.get(Link, link_id)
    if not db_link:
        raise HTTPException(status_code=404, detail="链接不存在")
        
    link_data = link.dict(exclude_unset=True)
    for key, value in link_data.items():
        setattr(db_link, key, value)
        
    session.add(db_link)
    session.commit()
    session.refresh(db_link)
    return db_link

# 3. 删除链接
@admin_router.delete("/links/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_link(link_id: int, session: Session = Depends(get_session)):
    """删除一个导航链接"""
    link = session.get(Link, link_id)
    if not link:
        raise HTTPException(status_code=404, detail="链接不存在")
        
    session.delete(link)
    session.commit()
    return

# 4. 修改账户信息 (密码和/或用户名)
@admin_router.put("/user/update")
def update_user(
    user_update: UserUpdate, 
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """管理员修改自己的密码和/或用户名"""

    # 1. 验证旧密码
    if not verify_password(user_update.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="旧密码错误，无法进行修改。"
        )

    # 2. 更新新密码
    if user_update.new_password:
        if not user_update.new_password.strip():
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="新密码不能为空。")
             
        current_user.password_hash = get_password_hash(user_update.new_password)
        
    # 3. 更新新用户名 (可选)
    if user_update.new_username and user_update.new_username != current_user.username:
        if session.exec(select(User).where(User.username == user_update.new_username)).first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="新用户名已被占用。")
        
        current_user.username = user_update.new_username

    session.add(current_user)
    session.commit()
    # ⚠️ 修复：添加 refresh 以确保对象同步
    session.refresh(current_user) 
    
    return {"message": "账户信息修改成功，请使用新密码重新登录！"}

# 将管理路由添加到主应用
app.include_router(admin_router)

# ==========================================================
# 静态文件和根路径路由
# ==========================================================

# 挂载静态文件目录
app.mount("/static", StaticFiles(directory="static"), name="static")

# 根路径重定向到前端 index.html
@app.get("/", include_in_schema=False)
def read_root_frontend():
    from starlette.responses import FileResponse
    return FileResponse("static/index.html")

# 根路径 /api/ 用于测试服务是否运行 (已存在)
@app.get("/api/", include_in_schema=False)
def read_root_api():
    # ⚠️ 修复：将消息名称改为 Lele-Panel
    return {"message": "Lele-Panel Backend Service Running."}