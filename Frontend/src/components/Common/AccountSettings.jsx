import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userAPI } from '../../api/user';
import { toastError, toastSuccess } from '../../utils/toast';

const AccountSettings = ({ onClose }) => {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null);
  const [online, setOnline] = useState(user?.online ?? true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user?.username || '');
    setEmail(user?.email || '');
    setAvatarPreview(user?.avatar || null);
    setOnline(user?.online ?? true);
  }, [user]);

  const handleAvatarChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    const url = URL.createObjectURL(f);
    setAvatarPreview(url);
  };

  const handleSave = async () => {
    if (newPassword && newPassword !== confirmPassword) {
      toastError('Mật khẩu mới và xác nhận mật khẩu không khớp');
      return;
    }

    setSaving(true);
    try {
      const form = new FormData();
      form.append('username', name);
      form.append('email', email);
      form.append('online', online);
      if (avatarFile) form.append('avatar', avatarFile);
      if (newPassword) {
        form.append('currentPassword', currentPassword);
        form.append('newPassword', newPassword);
      }

      const res = await userAPI.updateUser(user._id, form);
      toastSuccess('Cập nhật thông tin thành công');
      // update local auth user if available
      try {
        // some auth provider expose setUser; if not, dispatch an event
        if (typeof setUser === 'function') setUser(res.data);
        else window.dispatchEvent(new CustomEvent('userUpdated', { detail: res.data }));
      } catch (e) {
        e.printStackTrace();
        window.dispatchEvent(new CustomEvent('userUpdated', { detail: res.data }));
      }
    } catch (error) {
      console.error('Update account error', error);
      toastError('Không thể cập nhật tài khoản: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
          {avatarPreview ? (
            <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg font-semibold">{name?.charAt(0)?.toUpperCase() || '?'}</span>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium">Avatar</label>
          <input type="file" accept="image/*" onChange={handleAvatarChange} className="mt-2" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Tên</label>
        <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 rounded-md border" />
      </div>

      <div>
        <label className="block text-sm font-medium">Email</label>
        <input value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 rounded-md border" />
      </div>

      <div>
        <label className="block text-sm font-medium">Đổi mật khẩu</label>
        <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Mật khẩu hiện tại" className="w-full px-3 py-2 rounded-md border mb-2" />
        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mật khẩu mới" className="w-full px-3 py-2 rounded-md border mb-2" />
        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Xác nhận mật khẩu mới" className="w-full px-3 py-2 rounded-md border" />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Trạng thái hoạt động</p>
          <p className="text-sm text-gray-500">Cho phép hiển thị trạng thái online của bạn</p>
        </div>
        <label className="inline-flex items-center cursor-pointer">
          <input type="checkbox" className="hidden" checked={online} onChange={() => setOnline(prev => !prev)} />
          <span className={`w-12 h-6 flex items-center bg-gray-300 rounded-full p-1 ${online ? 'bg-orange-500' : ''}`}>
            <span className={`bg-white w-4 h-4 rounded-full shadow transform ${online ? 'translate-x-6' : ''}`} />
          </span>
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded">Hủy</button>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded">{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
      </div>
    </div>
  );
};

export default AccountSettings;
