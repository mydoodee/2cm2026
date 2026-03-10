import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'antd';

class ErrorBoundary extends Component {
    state = { hasError: false, error: null };

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold mb-4">เกิดข้อผิดพลาด</h1>
                        <p className="mb-4">{this.state.error?.message || 'เกิดข้อผิดพลาดที่ไม่คาดคิด'}</p>
                        <Button type="primary" onClick={() => window.location.reload()}>
                            โหลดหน้าใหม่
                        </Button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

ErrorBoundary.propTypes = {
    children: PropTypes.node.isRequired,
};

export default ErrorBoundary;