const sharp = require('sharp');
const path = require('path');

async function splitImage(inputPath, outputDir, prefix, count) {
  try {
    const metadata = await sharp(inputPath).metadata();
    const { width, height } = metadata;
    
    // Calculate height for each strip
    const stripHeight = Math.floor(height / count);
    
    console.log(`Processing ${inputPath}: ${width}x${height}`);
    console.log(`Each strip will be approximately ${stripHeight} pixels high`);
    
    for (let i = 0; i < count; i++) {
      const top = i * stripHeight;
      const outputPath = path.join(outputDir, `${prefix}_${i + 1}.png`);
      
      await sharp(inputPath)
        .extract({ 
          left: 0, 
          top: top, 
          width: width, 
          height: stripHeight 
        })
        .toFile(outputPath);
      
      console.log(`Created: ${outputPath}`);
    }
    
    console.log(`Successfully split ${inputPath} into ${count} images`);
  } catch (error) {
    console.error(`Error processing ${inputPath}:`, error);
  }
}

async function main() {
  const basePath = 'www/assets/src_01/信息栏';
  const outputDir = path.join(basePath, '便签');
  
  // Split icon_01.png (6 strips) - 圆角矩形
  await splitImage(
    path.join(basePath, 'icon_01.png'),
    outputDir,
    '便签_圆角',
    6
  );
  
  // Split icon_02.png (6 strips) - 箭头形状
  await splitImage(
    path.join(basePath, 'icon_02.png'),
    outputDir,
    '便签_箭头',
    6
  );
  
  console.log('All images have been processed');
}

main().catch(console.error);