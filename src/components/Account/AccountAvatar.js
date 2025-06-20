import React from 'react';
import Jazzicon from 'react-jazzicon';
import PropTypes from 'prop-types';

/**
 * 账户头像组件 - 根据地址生成唯一头像
 * @param {string} address - 钱包地址
 * @param {number} size - 头像大小，单位像素
 * @returns {JSX.Element}
 */
const AccountAvatar = ({ address, size = 32 }) => {
  // 从地址生成一个唯一的随机种子
  const seed = address ? parseInt(address.slice(2, 10), 16) : 0;
  
  return (
    <Jazzicon diameter={size} seed={seed} />
  );
};

AccountAvatar.propTypes = {
  address: PropTypes.string.isRequired,
  size: PropTypes.number
};

export default AccountAvatar; 