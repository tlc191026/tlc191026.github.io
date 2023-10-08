<!-- 使用HTML来设置背景图片和遮罩 -->
<style>
    body {
        /* 设置背景图片 */
        background-image: url('https://raw.githubusercontent.com/tlc191026/tlc191026.github.io/master/img/others/background.jpg');
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        
        /* 添加半透明遮罩 */
        position: relative;
    }
    
    /* 遮罩层 */
    .overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(255, 255, 255, 0.5); /* 半透明的白色遮罩 */
    }
    
    /* 遮罩层之上的内容样式 */
    .content {
        z-index: 1; /* 确保内容在遮罩层之上 */
    }
</style>

<div class="overlay"></div> <!-- 半透明遮罩层 -->

# 首页
## 你好
### 欢迎你的到来
&emsp;&emsp;这里是桐和辰的爱情记录网站 <https://tlc191026.github.io>