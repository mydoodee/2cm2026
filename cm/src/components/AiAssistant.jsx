import React, { useState, useEffect, useRef } from 'react';
import Navbar from './Navbar';
import api from '../axiosConfig';
import {
  RobotOutlined,
  SendOutlined,
  PlusOutlined,
  DeleteOutlined,
  LoadingOutlined,
  CopyOutlined,
  CheckOutlined,
  StopOutlined,
  DatabaseOutlined,
  LineChartOutlined,
  FileTextOutlined,
  CloudServerOutlined,
  DownloadOutlined,
  MessageOutlined,
  SearchOutlined,
  InfoCircleOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { Button, Input, Tooltip, message, Modal, Select, Table, Segmented } from 'antd';
import './AiAssistant.css';

const { TextArea } = Input;

function AiAssistant({ user, setUser, theme, setTheme, activeCompany, setActiveCompany }) {
  // AI modes: 'chat' (general), 'analyze' (deep project context), 'report' (executive), 'query' (SQL builder)
  const [aiMode, setAiMode] = useState('chat');
  const [conversations, setConversations] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Advanced features states
  const [projectsList, setProjectsList] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [systemConnected, setSystemConnected] = useState(true);

  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Load conversations and projects on mount or company change
  useEffect(() => {
    fetchConversations();
    fetchProjects();
    checkAiHealth();
  }, [activeCompany]);

  // Scroll to bottom on updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const checkAiHealth = async () => {
    try {
      const response = await api.get('/api/ai/health');
      setSystemConnected(!!response.data.success);
    } catch (e) {
      setSystemConnected(false);
    }
  };

  const fetchConversations = async () => {
    try {
      const response = await api.get('/api/ai/conversations');
      setConversations(response.data.conversations || []);
    } catch (err) {
      console.error('Failed to fetch conversations', err);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await api.get('/api/projects');
      setProjectsList(response.data.projects || []);
    } catch (err) {
      console.error('Failed to fetch projects', err);
    }
  };

  const selectConversation = async (id) => {
    if (isLoading) return;
    try {
      const response = await api.get(`/api/ai/conversation/${id}`);
      const conv = response.data.conversation;
      setCurrentId(conv.id);
      setMessages(conv.messages || []);
      
      // Auto restore mode if saved in history
      if (conv.mode) {
        setAiMode(conv.mode);
      }
      if (conv.project_id) {
        setSelectedProjectId(conv.project_id);
      } else {
        setSelectedProjectId(conv.mode === 'chat' ? null : 'all');
      }
    } catch (err) {
      message.error('ไม่สามารถโหลดประวัติการสนทนาได้');
    }
  };

  const startNewChat = () => {
    if (isLoading) return;
    setCurrentId(null);
    setMessages([]);
    if (aiMode === 'analyze' || aiMode === 'report') {
      setSelectedProjectId('all');
    } else {
      setSelectedProjectId(null);
    }
  };

  const deleteConversation = async (e, id) => {
    e.stopPropagation();
    Modal.confirm({
      title: 'ยืนยันการลบประวัติ?',
      content: 'คุณต้องการลบประวัติการสนทนานี้ถาวรใช่หรือไม่?',
      okText: 'ลบ',
      okType: 'danger',
      cancelText: 'ยกเลิก',
      onOk: async () => {
        try {
          await api.delete(`/api/ai/conversation/${id}`);
          message.success('ลบประวัติการสนทนาแล้ว');
          if (currentId === id) {
            startNewChat();
          }
          fetchConversations();
        } catch (err) {
          message.error('ลบไม่สำเร็จ');
        }
      }
    });
  };

  const handleSend = async (overridePrompt = null) => {
    if (isLoading) return;
    const promptToSend = overridePrompt !== null ? overridePrompt : inputVal;
    if (!promptToSend.trim() && aiMode !== 'analyze' && aiMode !== 'report') return;

    setIsLoading(true);
    setInputVal('');

    let newMessages = [...messages];
    let userText = promptToSend;

    // Build context-rich user message for selected modes
    if (overridePrompt === null) {
      if (aiMode === 'analyze') {
        const proj = selectedProjectId !== 'all' ? projectsList.find(p => p.project_id === selectedProjectId) : null;
        userText = proj 
          ? `📊 [สั่งวิเคราะห์ข้อมูลโครงการอัตโนมัติ] กรุณาวิเคราะห์จุดเด่น ความล่าช้า และเสนอมาตรการแก้ไขสำหรับโครงการ: ${proj.project_name}`
          : `📊 [สั่งวิเคราะห์ข้อมูลทุกโครงการอัตโนมัติ] กรุณาวิเคราะห์จุดเด่น ความล่าช้า และเสนอมาตรการแก้ไขของทุกโครงการในภาพรวม`;
      } else if (aiMode === 'report') {
        const proj = selectedProjectId !== 'all' ? projectsList.find(p => p.project_id === selectedProjectId) : null;
        userText = proj
          ? `📋 [สั่งร่างสรุปรายงานผู้บริหาร] กรุณาสร้างรายงานสรุปภาพรวมและงบประมาณของโครงการ: ${proj.project_name}`
          : `📋 [สั่งร่างสรุปรายงานผู้บริหารภาพรวม] กรุณาสร้างรายงานสรุปภาพรวมและงบประมาณของทุกโครงการในบริษัท`;
      }
    }

    newMessages.push({ role: 'user', content: userText, timestamp: new Date() });
    setMessages(newMessages);

    const token = localStorage.getItem('token');
    const companyId = localStorage.getItem('activeCompanyId') || '';

    // Handle Smart ERP Query Mode (Direct JSON API)
    if (aiMode === 'query') {
      try {
        const response = await api.post('/api/ai/query', { question: userText });
        if (response.data.success) {
          const resultStr = JSON.stringify({
            isQueryResult: true,
            sql: response.data.sql,
            explanation: response.data.explanation,
            results: response.data.results
          });
          const updatedMessages = [...newMessages, { role: 'assistant', content: resultStr, timestamp: new Date() }];
          setMessages(updatedMessages);
          await saveChatHistory(updatedMessages);
        } else {
          throw new Error(response.data.message || 'AI ไม่สามารถดึงคำตอบได้');
        }
      } catch (err) {
        message.error(err.message || 'เกิดข้อผิดพลาดในการประมวลผลคำสั่ง ERP');
        setMessages(prev => prev.slice(0, -1)); // clean user message if failed
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // AbortController for cancelable streams (for Chat, Analyze, Report modes)
    abortControllerRef.current = new AbortController();

    // Add placeholder bot message
    setMessages(prev => [...prev, { role: 'assistant', content: '', isStreaming: true }]);

    try {
      let url = '/api/ai/chat';
      let body = { messages: newMessages.map(m => ({ role: m.role, content: m.content })) };

      // Set specialized streaming endpoints for analyze & report modes
      if (aiMode === 'analyze') {
        url = `/api/ai/analyze/${selectedProjectId || 'all'}`;
        body = {}; // Params are inside URL
      } else if (aiMode === 'report') {
        url = `/api/ai/report/${selectedProjectId || 'all'}`;
        body = {}; // Params are inside URL
      }

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3050';
      const response = await fetch(`${API_URL}${url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-company-id': companyId
        },
        body: JSON.stringify(body),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error('ไม่สามารถติดต่อบริการ AI ได้');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.trim().startsWith('data:')) {
            try {
              const data = JSON.parse(line.substring(5).trim());
              if (data.error) {
                throw new Error(data.error);
              }
              if (data.text) {
                fullText += data.text;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: fullText,
                    isStreaming: true
                  };
                  return updated;
                });
              }
            } catch (e) {
              // ignore malformed lines
            }
          }
        }
      }

      // Finalize bot message
      const finalMessages = [...newMessages, { role: 'assistant', content: fullText, timestamp: new Date() }];
      setMessages(finalMessages);

      // Save history
      await saveChatHistory(finalMessages);
      setIsLoading(false);
    } catch (err) {
      if (err.name === 'AbortError') {
        message.info('ยกเลิกการวิเคราะห์แล้ว');
        setMessages(prev => {
          const updated = [...prev];
          if (updated[updated.length - 1]) {
            updated[updated.length - 1].isStreaming = false;
            updated[updated.length - 1].content += '\n\n*(ถูกหยุดโดยผู้ใช้งาน)*';
          }
          return updated;
        });
      } else {
        message.error(err.message || 'เกิดข้อผิดพลาดในการติดต่อ AI');
        setMessages(prev => prev.slice(0, -1)); // remove bot message placeholder
      }
      setIsLoading(false);
    }
  };

  const handleCancelStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const saveChatHistory = async (fullMessages) => {
    try {
      const firstUserMsg = fullMessages.find(m => m.role === 'user');
      const autoTitle = firstUserMsg ? firstUserMsg.content.substring(0, 50) : 'บทสนทนาใหม่';

      const response = await api.post('/api/ai/conversations', {
        id: currentId,
        title: autoTitle,
        messages: fullMessages.map(m => ({ role: m.role, content: m.content })),
        mode: aiMode,
        projectId: selectedProjectId === 'all' ? null : selectedProjectId
      });
      if (response.data.success) {
        setCurrentId(response.data.conversationId);
        fetchConversations();
      }
    } catch (err) {
      console.error('Failed to save history', err);
    }
  };

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    message.success('คัดลอกลงคลิปบอร์ดแล้ว');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const exportCSV = (data, filename) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvRows = [];
    
    // Header row
    csvRows.push(headers.join(','));
    
    // Data rows
    for (const row of data) {
      const values = headers.map(header => {
        const rawVal = row[header] === null || row[header] === undefined ? '' : row[header];
        const escaped = ('' + rawVal).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }
    
    // Add BOM for Thai character Excel support
    const csvContent = "\ufeff" + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Group conversations into date buckets for premium look
  const getGroupedConversations = () => {
    const groups = {
      today: [],
      yesterday: [],
      older: []
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    conversations.forEach(conv => {
      if (searchQuery.trim() && !conv.title?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return;
      }

      const updatedDate = new Date(conv.updated_at || conv.created_at);
      if (updatedDate >= today) {
        groups.today.push(conv);
      } else if (updatedDate >= yesterday) {
        groups.yesterday.push(conv);
      } else {
        groups.older.push(conv);
      }
    });

    return groups;
  };

  // Renders beautiful SQL statement and data results table for ERP query results
  const renderQueryResult = (content, idx) => {
    try {
      const data = JSON.parse(content);
      if (!data.isQueryResult) return <p>{content}</p>;

      const { sql, explanation, results } = data;

      const tableColumns = results && results.length > 0
        ? Object.keys(results[0]).map(key => ({
            title: key.toUpperCase().replace(/_/g, ' '),
            dataIndex: key,
            key: key,
            sorter: (a, b) => {
              if (typeof a[key] === 'number') return a[key] - b[key];
              return String(a[key]).localeCompare(String(b[key]));
            },
            render: (val) => {
              if (val === null || val === undefined) return '-';
              if (typeof val === 'number') {
                if (key.toLowerCase().includes('budget') || key.toLowerCase().includes('price') || key.toLowerCase().includes('amount')) {
                  return val.toLocaleString('th-TH') + ' บาท';
                }
                if (key.toLowerCase().includes('progress')) {
                  return val + '%';
                }
                return val.toLocaleString('th-TH');
              }
              if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
                return new Date(val).toLocaleDateString('th-TH');
              }
              return String(val);
            }
          }))
        : [];

      return (
        <div className="space-y-4 my-3 w-full">
          {explanation && (
            <div className="sql-query-explanation">
              <strong>🤖 การตีความคิวรี่:</strong> {explanation}
            </div>
          )}

          {sql && (
            <div className="sql-query-dashboard">
              <div className="sql-query-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:'12px',fontFamily:'monospace'}}>
                <span style={{display:'flex',alignItems:'center',gap:'6px',fontWeight:'bold'}}><DatabaseOutlined /> MYSQL GENERATED SQL</span>
                <button
                  onClick={() => copyToClipboard(sql, `sql-${idx}`)}
                  style={{border:'none',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',gap:'4px'}}
                >
                  {copiedIndex === `sql-${idx}` ? <CheckCircleOutlined style={{color:'#34c759'}} /> : <CopyOutlined />}
                  {copiedIndex === `sql-${idx}` ? 'คัดลอกสำเร็จ' : 'คัดลอก SQL'}
                </button>
              </div>
              <pre className="sql-query-body">{sql}</pre>
            </div>
          )}

          <div className="w-full">
            {results && results.length > 0 ? (
              <div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0 4px',marginBottom:'8px'}}>
                  <span style={{fontSize:'12px',color:'#8e8e93',fontWeight:'bold'}}>
                    จำนวนแถวข้อมูลที่ดึงได้: {results.length} แถว
                  </span>
                  <Button
                    type="link"
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => exportCSV(results, `erp_query_data`)}
                    style={{fontSize:'12px',fontWeight:'bold'}}
                  >
                    ดาวน์โหลดตารางข้อมูล (CSV)
                  </Button>
                </div>
                <div className="table-container">
                  <Table
                    dataSource={results.map((r, i) => ({ ...r, key: i }))}
                    columns={tableColumns}
                    pagination={{ pageSize: 5, showSizeChanger: false, size: 'small' }}
                    size="middle"
                    scroll={{ x: 'max-content' }}
                    className="premium-styled-table"
                  />
                </div>
              </div>
            ) : (
              <div style={{textAlign:'center',padding:'32px',background:'#f7f7f8',borderRadius:'12px',color:'#8e8e93',border:'1px dashed #e5e5e7'}}>
                <DatabaseOutlined style={{fontSize:'24px',marginBottom:'8px',opacity:0.5}} />
                <p style={{fontSize:'12px',margin:0}}>คำสั่งถูกต้องตามโครงสร้าง แต่ไม่มีรายการข้อมูลตรงตามเงื่อนไขในระบบ</p>
              </div>
            )}
          </div>
        </div>
      );
    } catch (err) {
      return <p style={{color:'#ff3b30',fontSize:'12px'}}>ข้อผิดพลาดในการแสดงผลคิวรี่: {err.message}</p>;
    }
  };

  // Simple Custom Markdown parsing
  const renderMessageContent = (content) => {
    if (!content) return null;

    // Check if it is a JSON string from SQL query mode
    if (content.startsWith('{"isQueryResult":true')) {
      return renderQueryResult(content);
    }

    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        const lines = part.split('\n');
        const language = lines[0].replace('```', '').trim() || 'code';
        const code = lines.slice(1, -1).join('\n');

        return (
          <div key={index} className="code-block-container">
            <div className="code-block-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span>{language.toUpperCase()}</span>
              <button 
                onClick={() => copyToClipboard(code, index)} 
                style={{border:'none',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',gap:'4px',color:'inherit'}}
              >
                {copiedIndex === index ? <CheckCircleOutlined style={{color:'#34c759'}} /> : <CopyOutlined />}
                {copiedIndex === index ? 'คัดลอกแล้ว' : 'คัดลอก'}
              </button>
            </div>
            <pre style={{background:'#1e1e1e',color:'#e0e0e0',padding:'16px',overflowX:'auto',fontSize:'13px',fontFamily:'Consolas, monospace',margin:0}}>
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      const lines = part.split('\n');
      let isTable = false;
      let tableRows = [];

      return lines.map((line, lineIdx) => {
        if (line.trim().startsWith('|')) {
          const cells = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
          
          if (line.includes('---')) {
            return null; // separator row, skip
          }

          if (!isTable) {
            isTable = true;
            tableRows = [cells];
            return null;
          } else {
            tableRows.push(cells);
            
            const isLastLineOfTable = lineIdx === lines.length - 1 || !lines[lineIdx + 1].trim().startsWith('|');
            if (isLastLineOfTable) {
              isTable = false;
              const headers = tableRows[0];
              const body = tableRows.slice(1);

              return (
                <div key={lineIdx} className="table-container">
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead>
                      <tr>
                        {headers.map((h, i) => (
                          <th key={i} style={{padding:'10px 14px',textAlign:'left',fontSize:'12px',fontWeight:600}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {body.map((row, rIdx) => (
                        <tr key={rIdx}>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} style={{padding:'10px 14px',fontSize:'13px'}}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }
            return null;
          }
        }

        if (isTable) return null;

        if (line.startsWith('### ')) {
          return <h3 key={lineIdx} style={{fontSize:'16px',fontWeight:700,marginTop:'16px',marginBottom:'8px'}}>{line.replace('### ', '')}</h3>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={lineIdx} style={{fontSize:'18px',fontWeight:700,marginTop:'20px',marginBottom:'8px',borderBottom:'1px solid #e5e5e7',paddingBottom:'4px'}}>{line.replace('## ', '')}</h2>;
        }
        if (line.startsWith('# ')) {
          return <h1 key={lineIdx} style={{fontSize:'20px',fontWeight:900,marginTop:'24px',marginBottom:'12px'}}>{line.replace('# ', '')}</h1>;
        }

        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          const cleanText = line.trim().replace(/^[-*]\s+/, '');
          return (
            <div key={lineIdx} style={{display:'flex',alignItems:'flex-start',gap:'8px',marginLeft:'16px',margin:'4px 0 4px 16px'}}>
              <span style={{color:'#10a37f',marginTop:'6px',fontSize:'8px'}}>•</span>
              <span>{parseInlineFormatting(cleanText)}</span>
            </div>
          );
        }

        if (line.trim() === '') {
          return <div key={lineIdx} style={{height:'8px'}} />;
        }

        return (
          <p key={lineIdx} style={{lineHeight:1.6,margin:'6px 0'}}>
            {parseInlineFormatting(line)}
          </p>
        );
      });
    });
  };

  const parseInlineFormatting = (text) => {
    const boldSplit = text.split(/\*\*(.*?)\*\*/g);
    return boldSplit.map((piece, i) => {
      if (i % 2 === 1) {
        return <strong key={i} style={{fontWeight:700}}>{piece}</strong>;
      }
      
      const inlineCodeSplit = piece.split(/`(.*?)`/g);
      return inlineCodeSplit.map((subPiece, j) => {
        if (j % 2 === 1) {
          return <code key={j} style={{background:'#f0f0f4',color:'#10a37f',padding:'1px 6px',borderRadius:'4px',fontFamily:'Consolas, monospace',fontSize:'12px'}}>{subPiece}</code>;
        }
        return subPiece;
      });
    });
  };

  // Get dynamic suggestions grid matching active AI mode
  const getPresetSuggestions = () => {
    switch (aiMode) {
      case 'analyze':
        return [
          { icon: <LineChartOutlined />, label: 'วิเคราะห์สถานะ S-Curve และหาจุดติดขัด', text: 'กรุณาวิเคราะห์จุดวิกฤตความคืบหน้า S-Curve และช่วยแนะนำแนวทางการเร่งงานก่อสร้างหน่อยครับ' },
          { icon: <InfoCircleOutlined />, label: 'ตรวจสอบความเบี่ยงเบนความช้ากว่าแผนงาน', text: 'ตรวจประเมินหาเปอร์เซ็นต์สะสมแผนงานเทียบความจริง และระบุแนวโน้มความเสี่ยงดีเลย์หน้างาน' }
        ];
      case 'report':
        return [
          { icon: <FileTextOutlined />, label: 'จัดทำสรุปรายงานภาพรวมสำหรับผู้บริหาร', text: 'กรุณาสรุปภาพรวมและร่างสรุปความก้าวหน้าโครงการก่อสร้างนี้ในรูปแบบรายงานสำหรับผู้บริหารครับ' },
          { icon: <CheckCircleOutlined />, label: 'ร่างวิเคราะห์ภาพรวมงบประมาณโครงการ', text: 'กรุณาร่างรายงานวิเคราะห์งบประมาณโครงการก่อสร้าง รายจ่ายจริง และการเปรียบเทียบแผนงบประมาณ' }
        ];
      case 'query':
        return [
          { icon: <DatabaseOutlined />, label: 'สอบถามงบประมาณโครงการสะสมทั้งหมด', text: 'ขอรายชื่อโครงการทั้งหมดที่มีงบประมาณสะสมมากกว่า 10 ล้านบาท' },
          { icon: <SearchOutlined />, label: 'ค้นหาข้อมูลประวัติคู่ค้าและผู้รับเหมา', text: 'ค้นหาข้อมูลผู้รับเหมาที่เคยทำงานประเภทเสาเข็มเจาะพร้อมรายละเอียดติดต่อ' }
        ];
      case 'chat':
      default:
        return [
          { icon: <MessageOutlined />, label: 'ถามสูตรโยธาและการคำนวณปริมาตรวัสดุ', text: 'สูตรคำนวณปริมาตรคอนกรีตเสากลม เส้นผ่านศูนย์กลาง 0.4 เมตร สูง 4 เมตร ต้องใช้คอนกรีตปริมาณเท่าไหร่?' },
          { icon: <PlusOutlined />, label: 'ตัวอย่างโครงสร้าง WBS สำหรับงานโครงสร้าง', text: 'ขอตัวอย่างการจัดทำโครงสร้าง Work Breakdown Structure (WBS) สำหรับงานก่อสร้างอาคาร คสล. 2 ชั้น' }
        ];
    }
  };

  const conversationsGroup = getGroupedConversations();

  return (
    <div className={`ai-assistant-page font-kanit ${theme === 'dark' ? 'dark' : ''}`}>
      <Navbar 
        user={user} 
        setUser={setUser} 
        theme={theme} 
        setTheme={setTheme} 
        activeCompany={activeCompany} 
        setActiveCompany={setActiveCompany} 
      />

      <div className="ai-layout-container">
        {/* Sidebar - GPT Styled */}
        <div className="ai-sidebar">
          <div className="sidebar-header">
            <Button
              type="default"
              icon={<PlusOutlined />}
              onClick={startNewChat}
              className="new-chat-btn"
            >
              การสนทนาใหม่
            </Button>
            
            <Input
              prefix={<SearchOutlined />}
              placeholder="ค้นหาประวัติ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sidebar-search"
            />
          </div>

          <div className="history-list">
            {/* TODAY */}
            {conversationsGroup.today.length > 0 && (
              <div className="history-group">
                <div className="history-group-title">วันนี้</div>
                {conversationsGroup.today.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => selectConversation(conv.id)}
                    className={`history-item ${currentId === conv.id ? 'active' : ''}`}
                  >
                    <MessageOutlined className="history-icon" />
                    <span className="history-title">{conv.title || 'บทสนทนาใหม่'}</span>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => deleteConversation(e, conv.id)}
                      className="delete-history-btn"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* YESTERDAY */}
            {conversationsGroup.yesterday.length > 0 && (
              <div className="history-group">
                <div className="history-group-title">เมื่อวาน</div>
                {conversationsGroup.yesterday.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => selectConversation(conv.id)}
                    className={`history-item ${currentId === conv.id ? 'active' : ''}`}
                  >
                    <MessageOutlined className="history-icon" />
                    <span className="history-title">{conv.title || 'บทสนทนาใหม่'}</span>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => deleteConversation(e, conv.id)}
                      className="delete-history-btn"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* OLDER */}
            {conversationsGroup.older.length > 0 && (
              <div className="history-group">
                <div className="history-group-title">ก่อนหน้านี้</div>
                {conversationsGroup.older.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => selectConversation(conv.id)}
                    className={`history-item ${currentId === conv.id ? 'active' : ''}`}
                  >
                    <MessageOutlined className="history-icon" />
                    <span className="history-title">{conv.title || 'บทสนทนาใหม่'}</span>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => deleteConversation(e, conv.id)}
                      className="delete-history-btn"
                    />
                  </div>
                ))}
              </div>
            )}

            {conversations.length === 0 && (
              <div className="empty-history">ไม่มีประวัติการสนทนา</div>
            )}
          </div>
        </div>

        {/* Main Chat Area - GPT Styled */}
        <div className="ai-main-chat">
          {/* Header Controller */}
          <div className="chat-header">
            <div className="header-meta">
              <span className="model-badge">
                <RobotOutlined /> Qwen2.5-Coder:14B
              </span>
              {systemConnected ? (
                <span className="status-badge connected">
                  <span className="status-dot" /> Online
                </span>
              ) : (
                <span className="status-badge disconnected">
                  <span className="status-dot" /> Offline
                </span>
              )}
            </div>

            <div className="header-controls">
              <Segmented
                value={aiMode}
                onChange={(value) => {
                  setAiMode(value);
                  if (value === 'chat') setSelectedProjectId(null);
                  else if ((value === 'analyze' || value === 'report') && !selectedProjectId) {
                    setSelectedProjectId('all');
                  }
                }}
                className="gpt-segmented"
                options={[
                  { label: 'แชททั่วไป', value: 'chat' },
                  { label: 'วิเคราะห์ S-Curve', value: 'analyze' },
                  { label: 'รายงานผู้บริหาร', value: 'report' },
                  { label: 'ถามตอบ ERP', value: 'query' }
                ]}
              />

              {(aiMode === 'analyze' || aiMode === 'report') && (
                <Select
                  placeholder="เลือกโครงการ..."
                  className="gpt-select"
                  value={selectedProjectId}
                  onChange={(val) => setSelectedProjectId(val || 'all')}
                  allowClear
                  options={[
                    { value: 'all', label: '🗂️ ทุกโครงการ (ภาพรวมบริษัท)' },
                    ...projectsList.map(p => ({
                      value: p.project_id,
                      label: `[Job: ${p.job_number || '-'}] ${p.project_name}`
                    }))
                  ]}
                />
              )}
            </div>
          </div>

          {/* Messages Wrapper */}
          <div className="chat-messages-container">
            {messages.length === 0 ? (
              /* Simple, Elegant Welcome Screen (GPT-like) */
              <div className="welcome-screen">
                <div className="welcome-logo">
                  <RobotOutlined />
                </div>
                <h2 className="welcome-title">
                  {aiMode === 'chat' && 'วันนี้มีประเด็นงานก่อสร้างอะไรให้ช่วยเหลือบ้างครับ?'}
                  {aiMode === 'analyze' && 'พร้อมสำหรับวิเคราะห์แผนงาน S-Curve โครงการก่อสร้าง'}
                  {aiMode === 'report' && 'สั่งสร้างร่างสรุปรายงานผู้บริหาร'}
                  {aiMode === 'query' && 'สืบค้นฐานข้อมูลระบบด้วยภาษาธรรมชาติ'}
                </h2>
                
                {/* Direct execution in specific modes */}
                {(aiMode === 'analyze' || aiMode === 'report') && (
                  <Button
                    type="primary"
                    icon={aiMode === 'analyze' ? <LineChartOutlined /> : <FileTextOutlined />}
                    onClick={() => handleSend()}
                    className="gpt-execute-btn"
                  >
                    {aiMode === 'analyze' 
                      ? (selectedProjectId && selectedProjectId !== 'all' ? 'เริ่มต้นวิเคราะห์ผลโครงการ' : 'เริ่มต้นวิเคราะห์ภาพรวมทุกโครงการ') 
                      : (selectedProjectId && selectedProjectId !== 'all' ? 'ร่างสรุปรายงานเดี๋ยวนี้' : 'ร่างสรุปรายงานทุกโครงการเดี๋ยวนี้')}
                  </Button>
                )}

                {/* Grid Suggestions - Clean layout */}
                <div className="suggestions-grid">
                  {getPresetSuggestions().map((q, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        if (aiMode === 'analyze' || aiMode === 'report') {
                          handleSend(q.text);
                        } else {
                          setInputVal(q.text);
                        }
                      }}
                      className="suggestion-card"
                    >
                      <div className="suggestion-icon">{q.icon}</div>
                      <div className="suggestion-content">
                        <div className="suggestion-label">{q.label}</div>
                        <div className="suggestion-text">{q.text}</div>
                      </div>
                      <ArrowRightOutlined className="suggestion-arrow" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Message Flow */
              <div className="messages-flow">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`message-row ${msg.role === 'user' ? 'user-row' : 'bot-row'}`}>
                    <div className={`message-wrapper-width ${msg.role === 'user' ? 'user-wrapper' : 'bot-wrapper'}`}>
                      <div className="message-header-row">
                        <div className="avatar">
                          {msg.role === 'user' ? (
                            <span className="user-avatar-text">{user?.first_name ? user.first_name[0] : 'U'}</span>
                          ) : (
                            <RobotOutlined />
                          )}
                        </div>
                        <span className="sender-name">
                          {msg.role === 'user' ? 'คุณ' : 'ผู้ช่วยระบบ CM'}
                        </span>
                      </div>
                      
                      <div className={`message-bubble ${msg.role === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
                        <div className="message-body">
                          {msg.role === 'assistant' ? (
                            <div className="bot-message-content">
                              {renderMessageContent(msg.content)}
                              {msg.isStreaming && (
                                <div className="streaming-indicator">
                                  <span className="streaming-text">กำลังพิมพ์สืบค้นข้อมูล...</span>
                                  <div className="typing-dots">
                                    <span className="typing-dot" />
                                    <span className="typing-dot" />
                                    <span className="typing-dot" />
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="user-message-content">{msg.content}</div>
                          )}
                        </div>
                      </div>

                      {msg.role === 'assistant' && !msg.isStreaming && (
                        <div className="message-actions">
                          <Tooltip title="คัดลอกคำตอบ">
                            <Button
                              type="text"
                              size="small"
                              icon={<CopyOutlined />}
                              onClick={() => {
                                let copyText = msg.content;
                                if (msg.content.startsWith('{"isQueryResult":true')) {
                                  try {
                                    const parsed = JSON.parse(msg.content);
                                    copyText = `[คำอธิบาย]: ${parsed.explanation}\n[SQL]: ${parsed.sql}`;
                                  } catch (e) {}
                                }
                                copyToClipboard(copyText, `msg-${idx}`);
                              }}
                              className="action-btn"
                            />
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Bottom Chat Input Form */}
          <div className="chat-input-bar-container">
            <div className="chat-input-wrapper">
              <TextArea
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder={
                  aiMode === 'chat' ? "ถามผู้ช่วยวิศวกรรม (เช่น สูตรคำนวณปูน, WBS งานเข็ม, Slump คอนกรีต)..." :
                  aiMode === 'analyze' ? "สั่งคำสั่งวิเคราะห์ความคืบหน้าโครงการ..." :
                  aiMode === 'report' ? "ร่างรายงานสรุปโครงการเสนอผู้บริหาร..." :
                  "พิมพ์ถามข้อมูล ERP เช่น 'ขอรายชื่อโครงการทั้งหมดที่มีงบประมาณมากกว่า 10 ล้านบาท'..."
                }
                autoSize={{ minRows: 1, maxRows: 6 }}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={isLoading}
                className="gpt-textarea"
              />
              <div className="input-actions">
                {isLoading ? (
                  <Button
                    type="primary"
                    danger
                    shape="circle"
                    icon={<StopOutlined />}
                    onClick={handleCancelStream}
                    className="stop-btn"
                  />
                ) : (
                  <Button
                    type="primary"
                    shape="circle"
                    icon={<SendOutlined />}
                    onClick={() => handleSend()}
                    disabled={!inputVal.trim() && aiMode !== 'analyze' && aiMode !== 'report'}
                    className={`send-btn ${inputVal.trim() || aiMode === 'analyze' || aiMode === 'report' ? 'active' : ''}`}
                  />
                )}
              </div>
            </div>
            <div className="input-footer-text">
              พลังขับเคลื่อนจาก Local Ollama AI • วิเคราะห์ข้อมูลโครงการด้วยความปลอดภัยสูงสุด
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AiAssistant;
