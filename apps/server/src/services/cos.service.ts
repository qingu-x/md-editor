const COS = require('cos-nodejs-sdk-v5');

export interface COSConfig {
  secretId: string;
  secretKey: string;
  bucket: string;
  region: string;
  customDomain?: string; // 自定义域名，如 https://img.wemd.top
}

export class COSService {
  private cos: any;
  private bucket: string;
  private region: string;
  private customDomain?: string;

  constructor(config: COSConfig) {
    this.cos = new COS({
      SecretId: config.secretId,
      SecretKey: config.secretKey,
    });
    this.bucket = config.bucket;
    this.region = config.region;
    this.customDomain = config.customDomain;
  }

  async uploadFile(
    file: Buffer,
    filename: string,
  ): Promise<{ url: string; key: string }> {
    const key = `images/${filename}`;

    return new Promise((resolve, reject) => {
      this.cos.putObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
          Body: file,
        },
        (err, data) => {
          if (err) {
            reject(err);
          } else {
            // 如果配置了自定义域名，使用自定义域名
            const url = this.customDomain
              ? `${this.customDomain}/${key}`
              : `https://${this.bucket}.cos.${this.region}.myqcloud.com/${key}`;
            resolve({ url, key });
          }
        },
      );
    });
  }
}
