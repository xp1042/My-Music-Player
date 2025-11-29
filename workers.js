```javascript
// 替换为你的 Workers KV 命名空间 ID
const KV_NAMESPACE = "YOUR_KV_NAMESPACE_ID";

// 替换为你的音乐 API 密钥
const MUSIC_API_KEY = "YOUR_MUSIC_API_KEY";

// 替换为你的音乐 API 端点
const MUSIC_API_ENDPOINT = "YOUR_MUSIC_API_ENDPOINT";

// 后台管理密码 (简单的保护)
const ADMIN_PASSWORD = "YOUR_ADMIN_PASSWORD";

async function handleRequest(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/admin") {
        // 后台管理界面
        return handleAdminRequest(request);
    } else if (path === "/playlist") {
        // 获取播放列表
        const playlist = await getPlaylist();
        return new Response(JSON.stringify(playlist), {
            headers: { "Content-Type": "application/json" },
        });
    } else if (path.startsWith("/song/")) {
        // 获取歌曲信息
        const songId = path.substring(6);
        const songInfo = await getSongInfo(songId);
        return new Response(JSON.stringify(songInfo), {
            headers: { "Content-Type": "application/json" },
        });
    } else {
        // 返回包含播放器和后台管理链接的 HTML 页面
        return new Response(await generatePlayerPage(), {
            headers: { "Content-Type": "text/html" },
        });
    }
}

// 生成包含播放器和后台管理链接的 HTML 页面
async function generatePlayerPage() {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Music Player</title>
        </head>
        <body>
            <h1>Music Player</h1>
            <ul id="playlist"></ul>
            <audio id="audioPlayer" controls></audio>
            <p><a href="/admin">管理播放列表</a></p>

            <script>
                const playlistElement = document.getElementById("playlist");
                const audioPlayer = document.getElementById("audioPlayer");

                async function loadPlaylist() {
                    try {
                        const response = await fetch("/playlist");
                        const playlist = await response.json();

                        playlist.forEach(async (songId) => {
                            const songInfoResponse = await fetch(\`/song/\${songId}\`);
                            const songInfo = await songInfoResponse.json();

                            const listItem = document.createElement("li");
                            listItem.textContent = \`\${songInfo.title} - \${songInfo.artist}\`;
                            listItem.addEventListener("click", () => playSong(songId));
                            playlistElement.appendChild(listItem);
                        });
                    } catch (error) {
                        console.error("Error loading playlist:", error);
                    }
                }

                async function playSong(songId) {
                    const songInfoResponse = await fetch(\`/song/\${songId}\`);
                    const songInfo = await songInfoResponse.json();

                    // 假设 songInfo 包含一个 audioUrl 属性，指向歌曲的音频流 URL
                    audioPlayer.src = songInfo.audioUrl;
                    audioPlayer.play();
                }

                loadPlaylist();
            </script>
        </body>
        </html>
    `;
}

// 处理后台管理请求
async function handleAdminRequest(request) {
    if (request.method === "POST") {
        // 处理表单提交
        const formData = await request.formData();
        const password = formData.get("password");

        if (password === ADMIN_PASSWORD) {
            const action = formData.get("action");

            if (action === "add") {
                const songId = formData.get("songId");
                await addSongToPlaylist(songId);
                return new Response("歌曲已添加到播放列表", {
                    headers: { "Content-Type": "text/plain" },
                });
            } else if (action === "remove") {
                const songId = formData.get("songId");
                await removeSongFromPlaylist(songId);
                return new Response("歌曲已从播放列表移除", {
                    headers: { "Content-Type": "text/plain" },
                });
            } else {
                return new Response("无效的操作", {
                    headers: { "Content-Type": "text/plain" },
                });
            }
        } else {
            return new Response("密码错误", {
                headers: { "Content-Type": "text/plain" },
            });
        }
    } else {
        // 返回后台管理表单
        return new Response(generateAdminForm(), {
            headers: { "Content-Type": "text/html" },
        });
    }
}

// 生成后台管理表单
function generateAdminForm() {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Admin</title>
        </head>
        <body>
            <h1>Admin</h1>
            <form method="POST">
                <label for="password">密码:</label><br>
                <input type="password" id="password" name="password"><br><br>

                <label for="songId">歌曲 ID:</label><br>
                <input type="text" id="songId" name="songId"><br><br>

                <button type="submit" name="action" value="add">添加歌曲</button>
                <button type="submit" name="action" value="remove">移除歌曲</button>
            </form>
        </body>
        </html>
    `;
}

// 获取播放列表
async function getPlaylist() {
    const playlistString = await MY_KV.get("playlist");

    if (!playlistString) {
        return [];
    }

    try {
        return JSON.parse(playlistString);
    } catch (error) {
        console.error("Error parsing playlist:", error);
        return [];
    }
}

// 添加歌曲到播放列表
async function addSongToPlaylist(songId) {
    const playlist = await getPlaylist();
    if (!playlist.includes(songId)) {
        playlist.push(songId);
        await MY_KV.put("playlist", JSON.stringify(playlist));
    }
}

// 从播放列表移除歌曲
async function removeSongFromPlaylist(songId) {
    let playlist = await getPlaylist();
    playlist = playlist.filter((id) => id !== songId);
    await MY_KV.put("playlist", JSON.stringify(playlist));
}

// 获取歌曲信息 (使用音乐 API)
async function getSongInfo(songId) {
    const apiUrl = \`\${MUSIC_API_ENDPOINT}/songs/\${songId}?apikey=\${MUSIC_API_KEY}\`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching song info:", error);
        return { error: "Failed to fetch song info" };
    }
}

addEventListener("fetch", (event) => {
    event.respondWith(handleRequest(event.request));
});
```

**代码解释:**

*   `ADMIN_PASSWORD`:  后台管理密码。 **重要:**  这是一个非常简单的保护机制。 在生产环境中，应该使用更安全的身份验证方法。
*   `handleAdminRequest`:  处理 `/admin` 路径的请求。
    *   `GET`:  返回后台管理表单。
    *   `POST`:  处理表单提交，验证密码，然后根据 `action` 参数添加或移除歌曲。
*   `generateAdminForm`:  生成后台管理表单的 HTML。
*   `addSongToPlaylist`:  将歌曲 ID 添加到播放列表。
*   `removeSongFromPlaylist`:  从播放列表移除歌曲 ID。
*   `generatePlayerPage`: 生成包含播放器和后台管理链接的HTML页面。
