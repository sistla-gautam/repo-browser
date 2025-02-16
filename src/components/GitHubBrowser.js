import React, { useState, useEffect } from 'react';
import { marked } from 'marked';

const GitHubBrowser = () => {
  const [currentPath, setCurrentPath] = useState('');
  const [contents, setContents] = useState([]);
  const [fileContent, setFileContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDarkTheme, setIsDarkTheme] = useState(
    localStorage.getItem('theme') === 'dark'
  );

  const username = 'sistla-gautam';
  const repo = 'second-brain';
  const branch = 'main';

  useEffect(() => {
    fetchContents('');
  }, []);

  useEffect(() => {
    document.body.setAttribute('data-theme', isDarkTheme ? 'dark' : 'light');
    localStorage.setItem('theme', isDarkTheme ? 'dark' : 'light');
  }, [isDarkTheme]);

  useEffect(() => {
    // Cleanup blob URLs when component unmounts or fileContent changes
    return () => {
      if (fileContent?.type === 'pdf' && fileContent?.content) {
        URL.revokeObjectURL(fileContent.content);
      }
    };
  }, [fileContent]);

  const fetchWithAuth = async (url) => {
    return fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.REACT_APP_GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
  };

  const fetchContents = async (path) => {
    setLoading(true);
    setError(null);
    setFileContent(null);
    
    try {
      const apiUrl = `https://api.github.com/repos/${username}/${repo}/contents/${path}?ref=${branch}`;
      const response = await fetchWithAuth(apiUrl);
      
      if (!response.ok) {
        throw new Error('Failed to fetch contents');
      }
      
      const data = await response.json();
      setContents(Array.isArray(data) ? data : [data]);
      setCurrentPath(path);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

 const viewFile = async (path) => {
    setLoading(true);
    setError(null);
    
    try {
      const apiUrl = `https://api.github.com/repos/${username}/${repo}/contents/${path}?ref=${branch}`;
      const response = await fetchWithAuth(apiUrl);
      
      if (!response.ok) {
        throw new Error('Failed to fetch file');
      }
      
      const fileData = await response.json();
      const isPdf = path.toLowerCase().endsWith('.pdf');

      if (isPdf) {
        console.log('Processing PDF file:', path);
        
        // For larger files, we'll need to fetch the raw content
        if (!fileData.content && fileData.download_url) {
          console.log('Large PDF detected, fetching from download_url');
          const pdfResponse = await fetchWithAuth(fileData.download_url);
          if (!pdfResponse.ok) throw new Error('Failed to fetch PDF content');
          
          const pdfBlob = await pdfResponse.blob();
          const pdfUrl = URL.createObjectURL(pdfBlob);
          console.log('Created PDF URL from download:', pdfUrl);
          
          setFileContent({
            type: 'pdf',
            content: pdfUrl,
            path,
            platform: /Android/i.test(navigator.userAgent) ? 'android' : 'desktop'
          });
        } 
        // For smaller files that include content
        else if (fileData.content) {
          console.log('Small PDF detected, using content directly');
          const binaryString = atob(fileData.content);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'application/pdf' });
          const pdfUrl = URL.createObjectURL(blob);
          console.log('Created PDF URL from content:', pdfUrl);
          
          setFileContent({
            type: 'pdf',
            content: pdfUrl,
            path,
            platform: /Android/i.test(navigator.userAgent) ? 'android' : 'desktop'
          });
        }
      } else if (fileData.content) {
        const content = atob(fileData.content.replace(/\n/g, ''));
        setFileContent({
          type: path.toLowerCase().endsWith('.md') ? 'markdown' : 'text',
          content,
          path
        });
      }
    } catch (err) {
      console.error('Error loading file:', err);
      setError(`Error loading file: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

const renderFileContent = () => {
    if (!fileContent) return null;

    if (fileContent.type === 'pdf') {
      return (
        <div>
          <div className="file-header">{fileContent.path}</div>
          <div className="pdf-container" style={{ width: '100%', height: '800px', border: '1px solid var(--border-color)', borderRadius: '0 0 6px 6px' }}>
            <object
              data={fileContent.content}
              type="application/pdf"
              style={{ width: '100%', height: '100%' }}
            >
              <embed
                src={fileContent.content}
                type="application/pdf"
                style={{ width: '100%', height: '100%' }}
              />
            </object>
            <div style={{ marginTop: '10px', textAlign: 'center' }}>
              <a 
                href={fileContent.content}
                target="_blank" 
                rel="noopener noreferrer"
                className="theme-toggle"
                style={{ textDecoration: 'none' }}
              >
                Open in New Tab
              </a>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div>
        <div className="file-header">{fileContent.path}</div>
        {fileContent.type === 'markdown' ? (
          <div
            className="markdown-body"
            dangerouslySetInnerHTML={{
              __html: marked(fileContent.content)
            }}
          />
        ) : (
          <pre>
            <code>{fileContent.content}</code>
          </pre>
        )}
      </div>
    );
  };

 const renderBreadcrumb = () => {
    const parts = currentPath ? currentPath.split('/') : [];
    return (
      <div className="breadcrumb">
        <a href="#" onClick={(e) => { e.preventDefault(); fetchContents(''); }}>root</a>
        {parts.map((part, index) => {
          const path = parts.slice(0, index + 1).join('/');
          return (
            <span key={path}>
              {' / '}
              <a href="#" onClick={(e) => { e.preventDefault(); fetchContents(path); }}>
                {part}
              </a>
            </span>
          );
        })}
      </div>
    );
  };

  const renderFileList = () => {
    if (loading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
      <ul>
        {currentPath && (
          <li>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                const parentPath = currentPath.split('/').slice(0, -1).join('/');
                fetchContents(parentPath);
              }}
            >
              ..
            </a>
          </li>
        )}
        {contents
          .sort((a, b) => {
            if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
            return a.name.localeCompare(b.name);
          })
          .map((item) => (
            <li key={item.path}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  item.type === 'dir' ? fetchContents(item.path) : viewFile(item.path);
                }}
              >
                {item.type === 'dir' ? '📁 ' : '📄 '}
                {item.name}
                {item.type === 'dir' ? '/' : ''}
              </a>
            </li>
          ))}
      </ul>
    );
  };

  return (
    <div className="container">
      <div className="header">
        <h1>GitHub Repository Browser</h1>
        <button
          className="theme-toggle"
          onClick={() => setIsDarkTheme(!isDarkTheme)}
        >
          Toggle Theme
        </button>
      </div>
      {renderBreadcrumb()}
      {renderFileList()}
      {renderFileContent()}
    </div>
  );
};

export default GitHubBrowser;
