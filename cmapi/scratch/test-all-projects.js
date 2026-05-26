const { handleAnalyzeProject, handleGenerateReport } = require('../src/controllers/aiController');

// Mock response object
const mockRes = {
  headers: {},
  setHeader(name, value) {
    this.headers[name] = value;
  },
  flushHeaders() {
    console.log('--- SSE Connection Established ---');
    console.log('Headers:', this.headers);
  },
  write(chunk) {
    // parse and print SSE format
    const str = chunk.toString();
    const matches = str.match(/data: (.*)/g);
    if (matches) {
      matches.forEach(m => {
        try {
          const jsonStr = m.replace('data: ', '').trim();
          const parsed = JSON.parse(jsonStr);
          if (parsed.text) {
            process.stdout.write(parsed.text);
          } else if (parsed.done) {
            console.log('\n--- Stream Done ---');
          } else if (parsed.error) {
            console.error('\nError:', parsed.error);
          }
        } catch (e) {
          // ignore parsing error for chunk
        }
      });
    }
  },
  end() {
    console.log('--- SSE Connection Closed ---');
    process.exit(0);
  },
  status(code) {
    console.log(`HTTP Status: ${code}`);
    return this;
  },
  json(data) {
    console.log('JSON Response:', JSON.stringify(data, null, 2));
    process.exit(0);
  }
};

// Mock request object
const mockReq = {
  params: {
    projectId: 'all' // test running all projects
  },
  companyId: 'spk-default',
  headers: {
    'x-company-id': 'spk-default'
  }
};

console.log('Testing handleAnalyzeProject with projectId="all"...');
handleAnalyzeProject(mockReq, mockRes);
