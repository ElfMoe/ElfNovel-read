import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { novelAPI } from '../services/api';
import '../styles/global.css';

function ChapterList() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [novel, setNovel] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 从API获取小说信息和章节列表
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 获取小说详情
        const novelResponse = await novelAPI.getNovelDetail(id);
        console.log('小说详情响应:', novelResponse);
        
        if (!novelResponse.success) {
          setError(novelResponse.message || '获取小说详情失败');
          return;
        }
        
        // 获取章节列表
        const chaptersResponse = await novelAPI.getNovelChapters(id);
        console.log('章节列表响应:', chaptersResponse);
        
        if (!chaptersResponse.success) {
          setError(chaptersResponse.message || '获取章节列表失败');
          return;
        }
        
        setNovel(novelResponse.data);
        setChapters(chaptersResponse.data);
        
      } catch (err) {
        console.error('获取数据错误:', err);
        setError('获取数据时发生错误，请稍后再试');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);

  const containerStyle = {
    backgroundColor: theme.background,
    color: theme.text,
    minHeight: '100vh',
    padding: '2rem 0'
  };

  const cardStyle = {
    backgroundColor: theme.cardBg,
    border: `1px solid ${theme.border}`,
    borderRadius: '0.5rem',
    padding: '2rem',
    maxWidth: '1000px',
    margin: '0 auto'
  };

  const chapterItemStyle = {
    padding: '1rem',
    margin: '0.5rem 0',
    borderRadius: '0.25rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backgroundColor: theme.cardBg,
    border: `1px solid ${theme.border}`,
    '&:hover': {
      backgroundColor: theme.accent,
      color: '#ffffff'
    }
  };

  // 如果正在加载
  if (loading) {
    return (
      <div style={containerStyle} className="d-flex justify-content-center align-items-center">
        <div className="text-center">
          <div className="spinner-border" role="status" style={{ color: theme.accent }}>
            <span className="visually-hidden">加载中...</span>
          </div>
          <p style={{ color: theme.text, marginTop: '1rem' }}>正在加载章节列表...</p>
        </div>
      </div>
    );
  }

  // 如果加载出错
  if (error) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div className="alert alert-danger" role="alert">
            {error}
            <div className="mt-3">
              <button 
                onClick={() => navigate(`/novel/${id}`)}
                className="btn"
                style={{
                  backgroundColor: theme.accent,
                  color: '#fff'
                }}
              >
                返回小说详情
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 style={{ 
            color: theme.text,
            fontSize: '1.8rem',
            borderBottom: `2px solid ${theme.accent}`,
            paddingBottom: '0.5rem',
            marginBottom: 0
          }}>
            {novel?.title} - 章节目录
          </h2>
          <button
            onClick={() => navigate(`/novel/${id}`)}
            className="btn"
            style={{
              backgroundColor: theme.accent,
              color: '#fff'
            }}
          >
            返回小说详情
          </button>
        </div>

        <div className="mb-4">
          <p style={{ color: theme.textSecondary }}>
            作者：{novel?.authorName} | 
            状态：{novel?.status === 'ongoing' || novel?.status === '连载中' ? '连载中' : '已完结'} | 
            总章节：{chapters.length || novel?.totalChapters || novel?.chaptersCount || 0}
          </p>
        </div>

        {chapters.length > 0 ? (
          <div className="chapter-list">
            {chapters.map((chapter) => (
              <div
                key={chapter._id}
                onClick={() => navigate(`/novel/${id}/read/${chapter.chapterNumber}`)}
                className="list-item-hover"
                style={{
                  padding: '1rem',
                  margin: '0.5rem 0',
                  borderRadius: '0.25rem',
                  backgroundColor: theme.cardBg,
                  border: `1px solid ${theme.border}`,
                  color: theme.text
                }}
              >
                {chapter.isExtra ? (
                  <>
                    番外：{chapter.title}
                  </>
                ) : (
                  <>
                    第{Math.floor(chapter.chapterNumber)}章：{chapter.title}
                  </>
                )}
                {chapter.isPremium && (
                  <span style={{
                    backgroundColor: theme.accent,
                    color: '#fff',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '9999px',
                    fontSize: '0.8rem',
                    marginLeft: '1rem'
                  }}>
                    会员
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-5">
            <p style={{ color: theme.text }}>暂无章节</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChapterList; 