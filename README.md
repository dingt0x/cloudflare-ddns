# claudeflare-ddns

群晖自定义DDNS供应商

```
https://your-worker.your-subdomain.workers.dev/update?hostname=abc.example.com&myip=1.2.3.4&username=user1&password=pass1
```

## 主要功能

1. 路径监听: 只响应 /update 路径的GET请求
2. 参数处理: 接收 hostname、myip、username、password 参数
3. 用户认证: 验证用户名和密码
4. IP验证: 支持IPv4和IPv6(TODO)地址格式验证
5. DNS更新: 自动创建或更新A/AAAA(TODO)记录

## Worker Variables and Secrets 配置

```dotenv
CLOUDFLARE_API_TOKEN: 你的Cloudflare API Token
ZONE_ID: 你的域名Zone ID
ALLOWED_USERS: {"用户名1":"密码1","用户名2":"密码2"}
DOMAIN_NAME: DOMAIN NAME
ALLOWED_HOSTNAMES: ["xxx.domain_name.com"] 
```

## API Token 权限
* Zone:Zone:Read
* Zone:DNS:Edit

## 响应格式
* 成功更新: good 1.2.3.4
* IP未变化: nochg 1.2.3.4
* 参数错误: HTTP 400
* 认证失败: HTTP 401
* 服务器错误: 911