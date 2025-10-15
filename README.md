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

