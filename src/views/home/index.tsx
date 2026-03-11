import React from 'react';
import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <h1>WisePen Portal</h1>
      <Button type="primary" onClick={() => navigate('/login')}>
        去登录
      </Button>
    </div>
  );
};
export default Home;
