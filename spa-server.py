#!/usr/bin/env python3
"""
支持SPA路由的简单HTTP服务器
"""
import http.server
import socketserver
import os

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__)) + "/dist"

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        # 添加缓存控制
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()
    
    def do_GET(self):
        # 尝试查找请求的文件
        path = self.translate_path(self.path)
        
        if os.path.isfile(path):
            # 文件存在，直接返回
            return super().do_GET()
        else:
            # 文件不存在，返回index.html（SPA fallback）
            index_path = os.path.join(DIRECTORY, 'index.html')
            if os.path.isfile(index_path):
                self.path = '/index.html'
                return super().do_GET()
            else:
                self.send_error(404, 'File not found')

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    """多线程服务器，支持并发"""
    allow_reuse_address = True

if __name__ == '__main__':
    os.chdir(DIRECTORY)
    with ThreadedHTTPServer(('', PORT), SPAHandler) as httpd:
        print(f'SPA服务器运行在 http://0.0.0.0:{PORT}')
        httpd.serve_forever()