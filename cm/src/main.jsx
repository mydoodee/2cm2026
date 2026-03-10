// development project
// import React from 'react';
// import ReactDOM from 'react-dom/client';
// import { BrowserRouter } from 'react-router-dom';
// import App from './App.jsx';
// import './index.css';

// // ========================================
// // Disable Console Logs in Production
// // ========================================
// if (import.meta.env.PROD) {
//     const noop = () => { };
//     console.log = noop;
//     console.warn = noop;
//     console.info = noop;
//     console.debug = noop;
//     // console.error ยังเปิดไว้ เพื่อให้ catch critical errors ได้
// }

// ReactDOM.createRoot(document.getElementById('root')).render(
//     <React.StrictMode>
//         <BrowserRouter basename="/cm">
//             <App />
//         </BrowserRouter>
//     </React.StrictMode>
// );


// //build project
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

// ✅ ปิด Console Logs ใน Production
if (import.meta.env.PROD) {
    const noop = () => { };
    console.log = noop;
    console.warn = noop;
    console.info = noop;
    console.debug = noop;
}

// ซ่อน locator-js errors
const originalError = console.error;
console.error = (...args) => {
    if (args[0] && args[0].includes('locator-js')) {
        return; // ไม่แสดง error ที่เกี่ยวข้องกับ locator-js
    }
    originalError.apply(console, args);
};

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter basename="/cm">
            <App />
        </BrowserRouter>
    </React.StrictMode>
);