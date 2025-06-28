// Cloudflare Worker for DDNS Updates
// 部署前需要在环境变量中设置以下值：
// - CLOUDFLARE_API_TOKEN: 你的Cloudflare API Token
// - ZONE_ID: 你的域名Zone ID
// - ALLOWED_USERS: JSON格式的用户认证信息，例如：{"user1":"pass1","user2":"pass2"}
// - ALLOWED_HOSTNAMES: JSON格式的允许更新的主机名列表，例如：["ddns.example.com","home.example.com"]
// - DOMAIN_NAME: 域名的名称

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)

  // 只处理 /update 路径
  if (url.pathname !== '/update') {
    return new Response('Not Found', { status: 404 })
  }

  // 只接受GET请求
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    // 获取URL参数并去除前后的 __
    const hostname = url.searchParams.get('hostname').endsWith(DOMAIN_NAME)
      ? url.searchParams.get('hostname')
      : `${url.searchParams.get('hostname')}.${DOMAIN_NAME}`;
    const myip = url.searchParams.get('myip')
    const username = url.searchParams.get('username')
    const password = url.searchParams.get('password')

    // 验证必需参数
    if (!hostname || !myip || !username || !password) {
      return new Response('Missing required parameters: hostname, myip, username, password', { status: 400 })
    }



    // 验证IP地址格式（仅IPv4）
    if (!isIPv4(myip)) {
      return new Response('Invalid IPv4 address format', { status: 400 })
    }

    // 验证主机名是否在允许列表中
    const allowedHostnames = JSON.parse(ALLOWED_HOSTNAMES || '[]')
    if (allowedHostnames.length > 0 && !allowedHostnames.includes(hostname)) {
      return new Response('Hostname not allowed', { status: 403 })
    }

    // 验证用户凭据
    const allowedUsers = JSON.parse(ALLOWED_USERS || '{}')
    if (!allowedUsers[username] || allowedUsers[username] !== password) {
      return new Response('Authentication failed', { status: 401 })
    }

    // 更新DNS记录
    const result = await updateDNSRecord(hostname, myip)

    if (result.success) {
      return new Response(`good ${myip}`, { status: 200 })
    } else {
      return new Response(`nochg ${myip}`, { status: 200 })
    }

  } catch (error) {
    console.error('Error updating DNS:', error)
    return new Response('911', { status: 500 })
  }
}

function removeUnderscores(value) {
  if (!value || typeof value !== 'string') {
    return value
  }

  // 去除前后的 __
  if (value.startsWith('__') && value.endsWith('__') && value.length > 4) {
    return value.slice(2, -2)
  }

  return value
}

async function updateDNSRecord(hostname, ip) {
  const apiToken = CLOUDFLARE_API_TOKEN
  const zoneId = ZONE_ID

  if (!apiToken || !zoneId) {
    throw new Error('Missing Cloudflare API credentials')
  }

  const headers = {
    'Authorization': `Bearer ${apiToken}`,
    'Content-Type': 'application/json'
  }

  try {
    // 首先获取现有的DNS记录
    const listUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?name.exact=${hostname}&type=A`
    // const listUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?type=A&name.exact=${hostname}.tindins.fun`
    const listResponse = await fetch(listUrl, { headers })

    const listData = await listResponse.json()


    if (!listData.success) {
      throw new Error(`Failed to list DNS records: ${listData.errors?.[0]?.message || 'Unknown error'}`)
    }

    let existingRecord
    if (listData.result?.length != 0) {
      existingRecord = listData.result[0]

    } else {
      existingRecord = false
    }


    if (existingRecord) {
      // 检查IP是否已经是最新的
      if (existingRecord.content === ip) {
        return { success: false, message: 'IP address unchanged' }
      }


      // 更新现有记录
      const updateUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${existingRecord.id}`
      const updateResponse = await fetch(updateUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          type: 'A',
          name: hostname,
          content: ip,
          ttl: 120 // 自动TTL
        })
      })

      const updateData = await updateResponse.json()

      if (!updateData.success) {
        throw new Error(`Failed to update DNS record: ${updateData.errors?.[0]?.message || 'Unknown error'}`)
      }

      return { success: true, message: 'DNS record updated successfully' }
    } else {
      // 创建新记录
      const createUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`
      const createResponse = await fetch(createUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'A',
          name: hostname,
          content: ip,
          ttl: 120 // 自动TTL
        })
      })

      const createData = await createResponse.json()

      if (!createData.success) {
        throw new Error(`Failed to create DNS record: ${createData.errors?.[0]?.message || 'Unknown error'}`)
      }

      return { success: true, message: 'DNS record created successfully' }
    }

  } catch (error) {
    console.error('Cloudflare API error:', error)
    throw error
  }
}

function isIPv4(ip) {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  return ipv4Regex.test(ip)
}