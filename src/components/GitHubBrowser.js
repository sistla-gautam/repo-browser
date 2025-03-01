import React, { useState, useEffect, useCallback } from "react";
import { marked } from "marked";

const GitHubBrowser = () => {
  const [currentPath, setCurrentPath] = useState("");
  const [contents, setContents] = useState([]);
  const [fileContent, setFileContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDarkTheme, setIsDarkTheme] = useState(
    localStorage.getItem("theme") === "dark"
  );

  const username = "sistla-gautam";
  const repo = "second-brain";
  const branch = "main";

  const fetchWithAuth = useCallback(async (url) => {
    return fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.REACT_APP_GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    });
  }, []);

  const fetchContents = useCallback(
    async (path) => {
      setLoading(true);
      setError(null);
      setFileContent(null);

      try {
        const apiUrl = `https://api.github.com/repos/${username}/${repo}/contents/${path}?ref=${branch}`;
        const response = await fetchWithAuth(apiUrl);

        if (!response.ok) {
          throw new Error("Failed to fetch contents");
        }

        const data = await response.json();
        setContents(Array.isArray(data) ? data : [data]);
        setCurrentPath(path);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [fetchWithAuth, username, repo, branch]
  );

  // Initialize with root contents
  useEffect(() => {
    fetchContents("");
  }, [fetchContents]);

  useEffect(() => {
    document.body.setAttribute("data-theme", isDarkTheme ? "dark" : "light");
    localStorage.setItem("theme", isDarkTheme ? "dark" : "light");
  }, [isDarkTheme]);

  useEffect(() => {
    // Cleanup blob URLs when component unmounts or fileContent changes
    return () => {
      if (fileContent?.type === "pdf" && fileContent?.content) {
        URL.revokeObjectURL(fileContent.content);
      }
    };
  }, [fileContent]);

  const viewFile = useCallback(
    async (path) => {
      setLoading(true);
      setError(null);

      try {
        const apiUrl = `https://api.github.com/repos/${username}/${repo}/contents/${path}?ref=${branch}`;
        const response = await fetchWithAuth(apiUrl);

        if (!response.ok) {
          throw new Error("Failed to fetch file");
        }

        const fileData = await response.json();
        const isPdf = path.toLowerCase().endsWith(".pdf");

        if (isPdf) {
          console.log("Processing PDF file:", path);

          try {
            // Construct the raw GitHub URL
            const rawUrl = `https://raw.githubusercontent.com/${username}/${repo}/${branch}/${path}`;

            // Create a fetch request with appropriate headers
            const pdfResponse = await fetch(rawUrl, {
              headers: {
                Accept: "application/pdf",
                // Add auth token if needed (GitHub public repos don't need it for raw files)
                ...(process.env.REACT_APP_GITHUB_TOKEN
                  ? {
                      Authorization: `Bearer ${process.env.REACT_APP_GITHUB_TOKEN}`,
                    }
                  : {}),
              },
            });

            if (!pdfResponse.ok) {
              // Try with explicit auth as fallback
              console.log("Direct raw fetch failed, trying with auth");
              const authResponse = await fetchWithAuth(fileData.download_url);
              if (!authResponse.ok)
                throw new Error("Failed to fetch PDF content");

              const pdfBlob = await authResponse.blob();
              const pdfUrl = URL.createObjectURL(pdfBlob);

              setFileContent({
                type: "pdf",
                content: pdfUrl,
                path,
              });
            } else {
              // Convert the response to a blob and create a blob URL
              const pdfBlob = await pdfResponse.blob();
              // Ensure correct content type for viewing
              const viewableBlob = new Blob([pdfBlob], {
                type: "application/pdf",
              });
              const pdfUrl = URL.createObjectURL(viewableBlob);

              setFileContent({
                type: "pdf",
                content: pdfUrl,
                path,
              });
            }
          } catch (pdfError) {
            console.error("Error with raw PDF fetch:", pdfError);

            // As final fallback, try GitHub's provided download_url
            if (fileData.download_url) {
              console.log("Using GitHub API download_url as fallback");
              const githubResponse = await fetch(fileData.download_url, {
                headers: {
                  Accept: "application/pdf",
                },
              });

              if (!githubResponse.ok)
                throw new Error("All PDF fetch methods failed");

              const pdfBlob = await githubResponse.blob();
              const viewableBlob = new Blob([pdfBlob], {
                type: "application/pdf",
              });
              const pdfUrl = URL.createObjectURL(viewableBlob);

              setFileContent({
                type: "pdf",
                content: pdfUrl,
                path,
              });
            } else {
              throw new Error("No valid PDF source available");
            }
          }
        } else if (fileData.content) {
          // Handle non-PDF files with content
          const content = atob(fileData.content.replace(/\n/g, ""));
          setFileContent({
            type: path.toLowerCase().endsWith(".md") ? "markdown" : "text",
            content,
            path,
          });
        } else if (fileData.download_url) {
          // For large text files that don't have content
          const textResponse = await fetchWithAuth(fileData.download_url);
          if (!textResponse.ok) throw new Error("Failed to fetch text content");
          const content = await textResponse.text();
          setFileContent({
            type: path.toLowerCase().endsWith(".md") ? "markdown" : "text",
            content,
            path,
          });
        } else {
          throw new Error("File content not available");
        }
      } catch (err) {
        console.error("Error loading file:", err);
        setError(`Error loading file: ${err.message}`);
      } finally {
        setLoading(false);
      }
    },
    [fetchWithAuth, username, repo, branch]
  );

  const renderFileContent = () => {
    if (!fileContent) return null;

    if (fileContent.type === "pdf") {
      return (
        <div>
          <div className="file-header">{fileContent.path}</div>
          <div
            className="pdf-container"
            style={{
              width: "100%",
              height: "800px",
              border: "1px solid var(--border-color)",
              borderRadius: "0 0 6px 6px",
            }}
          >
            {/* Using iframe for better PDF viewing compatibility */}
            <iframe
              src={fileContent.content}
              type="application/pdf"
              style={{ width: "100%", height: "100%", border: "none" }}
              title={`PDF Viewer: ${fileContent.path}`}
            >
              <p>
                Your browser doesn't support embedded PDFs.
                <a
                  href={fileContent.content}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Click here to view the PDF
                </a>
                .
              </p>
            </iframe>
            <div style={{ marginTop: "10px", textAlign: "center" }}>
              <a
                href={fileContent.content}
                target="_blank"
                rel="noopener noreferrer"
                className="theme-toggle"
                style={{ textDecoration: "none" }}
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
        {fileContent.type === "markdown" ? (
          <div
            className="markdown-body"
            dangerouslySetInnerHTML={{
              __html: marked(fileContent.content),
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
    const parts = currentPath ? currentPath.split("/") : [];
    return (
      <div className="breadcrumb">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            fetchContents("");
          }}
        >
          root
        </a>
        {parts.map((part, index) => {
          const path = parts.slice(0, index + 1).join("/");
          return (
            <span key={path}>
              {" / "}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  fetchContents(path);
                }}
              >
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
                const parentPath = currentPath
                  .split("/")
                  .slice(0, -1)
                  .join("/");
                fetchContents(parentPath);
              }}
            >
              ..
            </a>
          </li>
        )}
        {contents
          .sort((a, b) => {
            if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
            return a.name.localeCompare(b.name);
          })
          .map((item) => (
            <li key={item.path}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  item.type === "dir"
                    ? fetchContents(item.path)
                    : viewFile(item.path);
                }}
              >
                {item.type === "dir" ? "📁 " : "📄 "}
                {item.name}
                {item.type === "dir" ? "/" : ""}
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
