const aiService = require('./services/aiService');
const { getCompanyOverviewContext } = require('./services/dbContextBuilder');
const { SYSTEM_CHAT } = require('./services/promptTemplates');

async function main() {
  try {
    const companyContext = await getCompanyOverviewContext('spk-default');
    const sysPrompt = SYSTEM_CHAT + `\n\nนี่คือข้อมูลภาพรวมและรายละเอียดของโครงการทั้งหมดของบริษัทที่ผู้ใช้เปิดสิทธิ์เข้าถึง:\n${companyContext}`;
    
    const messages = [
      { role: 'system', content: sysPrompt },
      { role: 'user', content: 'ในปี พ.ศ. 2569 มีงานของ SPK ทั้งหมดกี่งาน และงานอะไรบ้าง' }
    ];

    console.log('Sending chat request to Ollama...');
    const response = await aiService.textChat(messages);
    console.log('=== Ollama Response ===');
    console.log(response);
  } catch (error) {
    console.error(error);
  }
}

main();
