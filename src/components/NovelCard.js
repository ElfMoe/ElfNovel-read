import { getFullImageUrl, handleImageError } from '../utils/imageUtils';

// ... 其他代码 ...

// 在渲染封面的地方
<img 
    src={getFullImageUrl(novel.cover)} 
    alt={novel.title} 
    onError={handleImageError}
    className="novel-card-cover"
/>

// ... 其他代码 ... 