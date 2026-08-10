// === ОТПРАВКА ДАННЫХ НА GITHUB (с созданием файлов) ===
async function syncWithGitHub() {
    if (isSyncing) return;
    isSyncing = true;
    const syncBtn = document.getElementById('syncBtn');
    syncBtn.innerText = t('syncButtonLoading');
    syncBtn.classList.add('syncing');

    try {
        if (!githubToken) {
            githubToken = prompt('🔑 Введите ваш GitHub Personal Access Token:\n(Нужны права на запись в репозиторий)');
            if (!githubToken) {
                isSyncing = false;
                syncBtn.innerText = t('syncButton');
                syncBtn.classList.remove('syncing');
                return;
            }
            localStorage.setItem('githubToken', githubToken);
        }

        const data = { videoDB, gifDB, imageDB, pollDB };
        const usersData = { users: usersDB };
        
        console.log('🔄 Отправка данных на GitHub...');

        // Функция для проверки существования файла
        async function fileExists(url) {
            try {
                const resp = await fetch(url);
                return resp.ok;
            } catch { return false; }
        }

        // Функция для получения SHA файла
        async function getFileSha(url) {
            try {
                const resp = await fetch(url);
                if (!resp.ok) return null;
                const json = await resp.json();
                return json.sha || null;
            } catch { return null; }
        }

        // === ОТПРАВКА videos.json ===
        const videoUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/videos.json`;
        const videoSha = await getFileSha(videoUrl);
        
        const videoResponse = await fetch(videoUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: `Обновление данных CarambaTV ${new Date().toLocaleString()}`,
                content: btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2)))),
                sha: videoSha || undefined
            })
        });

        if (!videoResponse.ok) {
            const errorText = await videoResponse.text();
            // Если ошибка 404 - файл не существует, пробуем создать без sha
            if (videoResponse.status === 404) {
                console.log('📄 Файл videos.json не найден, создаём новый...');
                const createResponse = await fetch(videoUrl, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${githubToken}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/vnd.github.v3+json'
                    },
                    body: JSON.stringify({
                        message: `Создание videos.json ${new Date().toLocaleString()}`,
                        content: btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))))
                    })
                });
                if (!createResponse.ok) {
                    const err = await createResponse.text();
                    throw new Error(`Ошибка создания videos.json: ${createResponse.status} ${err}`);
                }
                console.log('✅ videos.json создан!');
            } else {
                throw new Error(`Ошибка отправки videos.json: ${videoResponse.status} ${errorText}`);
            }
        } else {
            console.log('✅ videos.json обновлён');
        }

        // === ОТПРАВКА users.json ===
        const usersUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/users.json`;
        const usersSha = await getFileSha(usersUrl);
        
        const usersResponse = await fetch(usersUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: `Обновление пользователей CarambaTV ${new Date().toLocaleString()}`,
                content: btoa(unescape(encodeURIComponent(JSON.stringify(usersData, null, 2)))),
                sha: usersSha || undefined
            })
        });

        if (!usersResponse.ok) {
            const errorText = await usersResponse.text();
            if (usersResponse.status === 404) {
                console.log('📄 Файл users.json не найден, создаём новый...');
                const createResponse = await fetch(usersUrl, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${githubToken}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/vnd.github.v3+json'
                    },
                    body: JSON.stringify({
                        message: `Создание users.json ${new Date().toLocaleString()}`,
                        content: btoa(unescape(encodeURIComponent(JSON.stringify(usersData, null, 2))))
                    })
                });
                if (!createResponse.ok) {
                    const err = await createResponse.text();
                    console.warn('Ошибка создания users.json:', err);
                } else {
                    console.log('✅ users.json создан!');
                }
            } else {
                console.warn('Ошибка отправки users.json:', errorText);
            }
        } else {
            console.log('✅ users.json обновлён');
        }

        alert(t('syncSuccess'));
    } catch (error) {
        console.error('Ошибка синхронизации:', error);
        alert(`${t('syncError')}: ${error.message}`);
        if (error.message.includes('401') || error.message.includes('403')) {
            localStorage.removeItem('githubToken');
            githubToken = null;
        }
    } finally {
        isSyncing = false;
        syncBtn.innerText = t('syncButton');
        syncBtn.classList.remove('syncing');
    }
}