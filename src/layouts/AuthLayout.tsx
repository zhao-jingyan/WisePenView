import loginImage from '@/assets/images/login.png';
import { Flex, Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import styles from './AuthLayout.module.less';

const AuthLayout: React.FC = () => {
  return (
    <Layout className={styles.root}>
      <Flex className={styles.authSheet}>
        <img src={loginImage} className={styles.loginImage} />
        <Flex className={styles.formSection}>
          <Outlet />
        </Flex>
      </Flex>
    </Layout>
  );
};

export default AuthLayout;
