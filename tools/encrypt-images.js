/**
 * 图片加密工具
 * 用于将图片加密为AES加密的JSON文件
 * 与浏览器端Web Crypto API兼容
 *
 * 使用方法:
 * node encrypt-images.js --password "your-password" --input "./img" --output "./docs/encrypted-images"
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 命令行参数解析
function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    params[key] = value;
  }

  return params;
}

// 使用PBKDF2派生密钥（与Web Crypto API兼容）
function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
}

// AES-CBC加密
function encrypt(data, password) {
  const algorithm = 'aes-256-cbc';
  const salt = Buffer.from('salt'); // 与浏览器端保持一致
  const key = deriveKey(password, salt);
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(data);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return {
    iv: iv.toString('hex'),
    data: encrypted.toString('hex')
  };
}

// 生成密码的SHA256 hash（用于验证）
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// 处理单个图片
function processImage(inputPath, outputPath, password) {
  const imageBuffer = fs.readFileSync(inputPath);
  const base64Data = imageBuffer.toString('base64');

  const encrypted = encrypt(base64Data, password);

  const result = {
    type: 'encrypted-image',
    algorithm: 'aes-256-cbc',
    iv: encrypted.iv,
    data: encrypted.data,
    originalName: path.basename(inputPath)
  };

  // 生成输出文件名
  const outputFileName = path.basename(inputPath, path.extname(inputPath)) + '.enc.json';
  const outputFilePath = path.join(outputPath, outputFileName);

  fs.writeFileSync(outputFilePath, JSON.stringify(result, null, 2));
  console.log(`加密: ${inputPath} -> ${outputFilePath}`);

  return outputFileName;
}

// 递归处理目录
function processDirectory(inputDir, outputDir, password, relativePath = '') {
  const items = fs.readdirSync(inputDir);
  const manifest = [];

  for (const item of items) {
    const inputPath = path.join(inputDir, item);
    const stat = fs.statSync(inputPath);

    if (stat.isDirectory()) {
      // 递归处理子目录
      const newRelativePath = relativePath ? `${relativePath}/${item}` : item;
      const subOutputDir = path.join(outputDir, item);
      fs.mkdirSync(subOutputDir, { recursive: true });
      processDirectory(inputPath, subOutputDir, password, newRelativePath);
    } else if (/\.(jpg|jpeg|png|gif|webp)$/i.test(item)) {
      // 处理图片文件
      const outputFileName = processImage(inputPath, outputDir, password);
      manifest.push({
        original: item,
        encrypted: outputFileName,
        path: relativePath
      });
    }
  }

  // 保存manifest文件
  if (manifest.length > 0) {
    const manifestPath = path.join(outputDir, 'manifest.json');
    // 合并已有manifest
    let existingManifest = [];
    if (fs.existsSync(manifestPath)) {
      existingManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    }
    const combinedManifest = [...existingManifest, ...manifest];
    fs.writeFileSync(manifestPath, JSON.stringify(combinedManifest, null, 2));
  }
}

// 主函数
function main() {
  const params = parseArgs();

  if (!params.password || !params.input || !params.output) {
    console.log('使用方法: node encrypt-images.js --password "密码" --input "输入目录" --output "输出目录"');
    console.log('');
    console.log('示例:');
    console.log('  node encrypt-images.js --password "mypass123" --input "./img" --output "./docs/encrypted-images"');
    process.exit(1);
  }

  const inputDir = path.resolve(params.input);
  const outputDir = path.resolve(params.output);

  if (!fs.existsSync(inputDir)) {
    console.error(`错误: 输入目录不存在 - ${inputDir}`);
    process.exit(1);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  console.log('========================================');
  console.log('图片加密工具');
  console.log('========================================');
  console.log(`输入目录: ${inputDir}`);
  console.log(`输出目录: ${outputDir}`);
  console.log('');

  // 生成并显示密码hash
  const passwordHash = hashPassword(params.password);
  console.log(`密码Hash: ${passwordHash}`);
  console.log('(请将此hash复制到 image-crypto.js 中的 PASSWORD_HASH 变量)');
  console.log('');

  console.log('正在加密...');
  console.log('');

  processDirectory(inputDir, outputDir, params.password);

  console.log('');
  console.log('加密完成!');
  console.log('');
  console.log('下一步:');
  console.log('1. 将密码hash设置到 docs/javascripts/image-crypto.js 的 PASSWORD_HASH 变量');
  console.log('2. 在相册页面中使用 data-encrypted 属性引用加密文件');
  console.log('3. 示例: <img data-encrypted="../encrypted-images/photo.enc.json" alt="描述">');
}

main();
