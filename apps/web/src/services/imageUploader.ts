import type { GithubConfig, LocalConfig } from '../store/settingsStore';

export interface UploadResult {
    url: string;
    filename: string;
}

export const uploadImageToLocal = async (file: File, config: LocalConfig): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${config.serverUrl}/upload`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error(`上传失败: ${response.statusText}`);
    }

    const data = await response.json();
    return {
        url: data.url,
        filename: data.filename || file.name,
    };
};

export const uploadImageToGitHub = async (file: File, config: GithubConfig): Promise<UploadResult> => {
    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;
    const content = await fileToBase64(file);
    const path = `images/${filename}`; // 默认文件夹

    const response = await fetch(`https://api.github.com/repos/${config.repo}/contents/${path}`, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${config.token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message: `Upload ${filename} via WeMD`,
            content: content,
            branch: config.branch || 'main',
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'GitHub 上传失败');
    }

    const data = await response.json();
    let url = data.content.download_url;

    if (config.useJsDelivr) {
        url = `https://cdn.jsdelivr.net/gh/${config.repo}@${config.branch || 'main'}/${path}`;
    }

    return {
        url,
        filename,
    };
};

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // 移除 "data:image/png;base64," 前缀
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
};