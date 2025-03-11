# 主页背景图片替换指南

## 当前设置

我们的主页分为五个场景，每个场景使用一张背景图片，并带有"呼吸"动画效果：

1. **欢迎场景**：需要奇幻风格，但与奇幻场景图片不同
2. **奇幻场景**：使用当前的奇幻图片
3. **科技场景**：需要科技/未来风格图片
4. **校园场景**：需要温馨校园风格图片
5. **结束场景**：需要适合结束语的图片

**特殊效果**：所有背景图片都具有轻微的"呼吸"效果（缓慢放大缩小），即使用户不滚动页面，背景也会有生动的动态感。

## 替换图片步骤

1. 将您选择的图片放入 `my-app/src/assets/` 目录
2. 在 `my-app/src/pages/Home.js` 文件中更新图片导入路径：

```javascript
// 替换这些导入语句，使用您的实际图片
import welcomeBg from '../assets/你的欢迎场景图片.jpg';
import fantasyBg from '../assets/你的奇幻场景图片.jpg';
import scifiBg from '../assets/你的科技场景图片.jpg';
import romanceBg from '../assets/你的校园场景图片.jpg';
import endBg from '../assets/你的结束场景图片.jpg';
```

## 图片建议

### 图片尺寸和类型
- 建议使用高质量的大尺寸图片（至少1920x1080像素）
- 所有图片最好使用相同的宽高比
- 由于背景有放大效果，建议图片分辨率比实际需要的略大
- 选择主体居中的图片效果最佳，因为动画会围绕中心点放大缩小

### 背景图片位置
各场景背景图片位置已设置如下：
- 欢迎场景：center top - 顶部居中对齐
- 奇幻场景：center center - 完全居中
- 科技场景：center center - 完全居中
- 校园场景：center center - 完全居中
- 结束场景：center bottom - 底部居中对齐

### 风格建议
1. **欢迎场景**：奇幻风格，明亮色调，展示奇幻世界全景
2. **奇幻场景**：深色奇幻场景，可以包含魔法元素
3. **科技场景**：未来都市、科技感强、蓝色调为主
4. **校园场景**：明亮温馨的校园、樱花、图书馆等元素
5. **结束场景**：温暖的日落或黎明场景，象征旅程的开始

### 图片来源
可以从以下网站获取免费高质量图片：
- Unsplash (https://unsplash.com/)
- Pexels (https://www.pexels.com/)
- Pixabay (https://pixabay.com/)

## 调整动画效果

如果您想调整背景的"呼吸"动画效果，可以在 `my-app/src/styles/home.css` 文件中修改以下部分：

```css
@keyframes backgroundBreathing {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05); /* 调整这个值可以改变放大的程度 */
  }
  100% {
    transform: scale(1);
  }
}

.section::after {
  /* ... 其他样式 ... */
  animation: backgroundBreathing 15s ease-in-out infinite; /* 调整15s可以改变动画速度 */
}
```

## 调整渐变效果

渐变效果已经加强，确保文字在各种背景上清晰可见。如果需要进一步调整，可以在 `my-app/src/styles/home.css` 文件中修改以下部分：

```css
.welcome-section::before {
  background: linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.6)),
              linear-gradient(to right, rgba(120,70,180,0.2), rgba(50,20,90,0.3));
}

/* 其他场景的渐变效果也可以类似调整 */
```

## 恢复视差效果（可选）

如果您希望恢复轻微的视差效果，可以编辑 `Home.js` 中的 `getParallaxStyle` 函数：

```javascript
const getParallaxStyle = (sectionIndex) => {
  // 添加轻微视差效果
  const baseOffset = scrollY * 0.01; // 使用非常小的系数
  const offset = baseOffset - (sectionIndex * window.innerHeight * 0.005);
  
  // 其他代码保持不变...
  
  return {
    backgroundImage: `url(${backgrounds[sectionIndex]})`,
    backgroundPosition: `${positions[sectionIndex].split(' ')[0]} calc(${positions[sectionIndex].split(' ')[1]} + ${offset}px)`,
    backgroundSize: 'cover',
    backgroundAttachment: 'fixed'
  };
};
```

## 性能注意事项

- 图片大小会影响页面加载速度，建议压缩图片文件
- 连续的CSS动画可能在一些低性能设备上造成负担，如果发现性能问题，可考虑减小动画幅度或延长周期
- 可以使用工具如 TinyPNG (https://tinypng.com/) 压缩图片而不明显降低质量 