// ========================================
// Console Suppressor - Security
// ปิด console.log ใน production เพื่อความปลอดภัย
// ========================================
if (process.env.NODE_ENV === 'production') {
    const noop = () => { };
    console.log = noop;
    console.info = noop;
    console.debug = noop;
    // console.warn and console.error are kept for critical errors
}
