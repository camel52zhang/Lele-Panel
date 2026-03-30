from typing import Optional
from sqlmodel import Field, SQLModel, create_engine, Session

# -----------------
# 1. 导航链接模型 (Link)
# -----------------
# 这个类定义了数据库中一个导航链接所包含的所有信息
class LinkBase(SQLModel):
    """导航链接的基础字段"""
    name: str = Field(index=True)           # 链接名称 (如: ChatGPT)
    url: str                                # 目标网址 (如: https://chat.openai.com/)
    icon: str                               # 链接图标 (可是一个URL或图标名称)
    group: str = Field(index=True)          # 链接分组 (如: AI, 工具, 系统)
    sort_order: int = 100                   # 排序数字 (数字越小越靠前)
    is_public: bool = True                  # 是否公开 (前端首页是否显示)
    
# Link 类代表数据库中的表结构
class Link(LinkBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

# -----------------
# 2. 用户模型 (User)
# -----------------
# 这个类定义了管理员账户信息
class UserBase(SQLModel):
    username: str = Field(unique=True, index=True)
    
# User 类代表数据库中的表结构
class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    # password_hash 是存储在数据库中的密码 (安全起见, 不存明文)
    password_hash: str
    
# -----------------
# 3. 数据库初始化
# -----------------

# 数据库文件名为 "database.db"
sqlite_file_name = "database.db"
# 创建连接引擎 (connect_args={'check_same_thread': False} 是 SQLite 在 FastAPI 中需要的配置)
sqlite_url = f"sqlite:///{sqlite_file_name}"
engine = create_engine(sqlite_url, echo=True, connect_args={"check_same_thread": False})

def create_db_and_tables():
    """创建数据库文件和所有的表结构"""
    SQLModel.metadata.create_all(engine)
    
def get_session():
    """用于 FastAPI 依赖注入，获取数据库会话"""
    with Session(engine) as session:
        yield session

if __name__ == "__main__":
    # 可以在命令行运行此文件来初始化数据库
    create_db_and_tables()
    print("数据库和表结构已创建!")
