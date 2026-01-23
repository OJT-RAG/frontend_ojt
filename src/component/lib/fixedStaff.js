// utils/fixedStaff.js

export const STAFF_KEY = (userId) =>
  `fixed_staff_for_user_${userId}`;

export const getFixedStaff = (staffList, userId) => {
  if (!userId || staffList.length === 0) return null;

  const key = STAFF_KEY(userId);
  const savedStaffId = localStorage.getItem(key);

  // ✅ nếu đã có staff → lấy lại
  if (savedStaffId) {
    return staffList.find(
      (s) => String(s.userId) === String(savedStaffId)
    );
  }

  // ✅ chưa có → random 1 staff
  const picked =
    staffList[Math.floor(Math.random() * staffList.length)];

  localStorage.setItem(key, picked.userId);
  return picked;
};

export const clearFixedStaff = (userId) => {
  localStorage.removeItem(STAFF_KEY(userId));
};
