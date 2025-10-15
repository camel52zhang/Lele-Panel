# Lele-Panel
**项目简介：**

一个类[sun-panel](https://github.com/hslr-s/sun-panel)的导航站，轻量级，支持docker部署

**演示站点：**

http://nav.lelez.site:8080/



**界面预览：**

![lele-panel-1](https://github.com/camel52zhang/pic__bed1/blob/main/2025/lele-panel-1.png?raw=true)

![lele-panel-2](https://github.com/camel52zhang/pic__bed1/blob/main/2025/lele-panel-2.png?raw=true)

**管理入口**

![lele-panel-3](https://github.com/camel52zhang/pic__bed1/blob/main/2025/lele-panel-3.png?raw=true)

**管理浮动窗口**

![lele-panel-3](https://github.com/camel52zhang/pic__bed1/blob/main/2025/lele-panel-3-1.png?raw=true)

**添加修改链接入口**

![lele-panel-3](https://github.com/camel52zhang/pic__bed1/blob/main/2025/lele-panel-4.png?raw=true)

**添加修改链接浮动窗口**

![lele-panel-3](https://github.com/camel52zhang/pic__bed1/blob/main/2025/lele-panel-4-1.png?raw=true)

> 其中`图标：`是基于三个方式来创建，一个是[iconfont](https://www.iconfont.cn/)，一个是[iconify](https://icon-sets.iconify.design/)，一个是图片的`url`，其中`iconfont`是我自己的项目，假如写上名字没有图标显示就是我的项目没收藏，可以尝试使用[favicon](https://favicon.im/)来解析的地址，操作方式如网站`google.com`,可以使用`https://favicon.im/google.com`填写到`图标：`栏，这样就会生成图标了



**docker一键部署**

~~~
docker run -d -p 8080:8000 --name lelepanel_app camel52zhang/lelepanel:latest
~~~

> 端口8080可以自定义，但8000不能动

或者先拉去后部署

~~~
# 先拉取
docker pull camel52zhang/lelepanel:latest
# 拉取完成后部署
docker run -d -p 8080:8000 --name lelepanel_app camel52zhang/lelepanel:latest
~~~

