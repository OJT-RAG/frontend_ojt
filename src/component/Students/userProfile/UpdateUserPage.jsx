import React, { useState, useEffect } from "react";
import { Form, Input, Button, DatePicker, Upload, message } from "antd";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import userApi from "../../API/UserAPI";
import "./UpdateUserProfile.css";

const UpdateUserPage = ({ userId = 0 }) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [avatarFileList, setAvatarFileList] = useState([]);
  const [cvFileList, setCvFileList] = useState([]);

  const resolvedUserId = React.useMemo(() => {
    if (userId && Number(userId) > 0) return Number(userId);
    try {
      const authUser = JSON.parse(localStorage.getItem("authUser") || "{}") || {};
      return Number(authUser.id) || 0;
    } catch {
      return 0;
    }
  }, [userId]);

  // Fetch dữ liệu user khi component mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (!resolvedUserId) {
          message.warning("Missing userId. Please login first.");
          return;
        }

        const res = await userApi.getById(resolvedUserId);
        const data = res?.data?.data ?? res?.data ?? {};
        form.setFieldsValue({
          ...data,
          majorId: data?.majorId ?? "",
          companyId: data?.companyId ?? "",
          dob: data?.dob ? moment(data.dob) : null,
        });
      } catch (error) {
        console.error(error);
        message.error("Failed to fetch user data");
      }
    };

    fetchUser();
  }, [resolvedUserId, form]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const fd = new FormData();
      const userIdValue = values.userId ?? resolvedUserId;
      fd.append("UserId", String(userIdValue || ""));
      fd.append("StudentCode", values.studentCode ?? "");
      fd.append("Phone", values.phone ?? "");
      fd.append(
        "MajorId",
        values.majorId === 0 || values.majorId === "0" ? "" : (values.majorId ?? "")
      );
      fd.append("Dob", values.dob ? values.dob.format("YYYY-MM-DD") : "");
      fd.append(
        "CompanyId",
        values.companyId === 0 || values.companyId === "0" ? "" : (values.companyId ?? "")
      );
      fd.append("Fullname", values.fullname ?? "");
      fd.append("Password", values.password ?? "");

      const avatarFile = avatarFileList?.[0]?.originFileObj;
      if (avatarFile instanceof File) {
        fd.append("AvatarUrl", avatarFile, avatarFile.name);
      }
      const cvFile = cvFileList?.[0]?.originFileObj;
      if (cvFile instanceof File) {
        fd.append("CvUrl", cvFile, cvFile.name);
      }

      await userApi.update(fd);
      navigate("/profile/cv", {
        replace: true,
        state: { profileUpdated: true },
      });
    } catch (error) {
      console.error(error);
      message.error("Failed to update user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="update-user-container">
  <h2>Update User</h2>
  <Form
    form={form}
    layout="vertical"
    onFinish={onFinish}
    initialValues={{ userId: resolvedUserId }}
  >
        <Form.Item name="userId" hidden>
          <Input />
        </Form.Item>

        <Form.Item name="majorId" label="Major ID">
          <Input type="number" />
        </Form.Item>

        <Form.Item name="companyId" label="Company ID">
          <Input type="number" />
        </Form.Item>

        <Form.Item
          name="fullname"
          label="Full Name"
          rules={[{ required: true, message: "Please enter full name" }]}
        >
          <Input />
        </Form.Item>

        <Form.Item name="studentCode" label="Student Code">
          <Input />
        </Form.Item>

        <Form.Item name="dob" label="Date of Birth">
          <DatePicker format="YYYY-MM-DD" />
        </Form.Item>

        <Form.Item name="phone" label="Phone">
          <Input />
        </Form.Item>

        <Form.Item label="Avatar (optional)">
          <Upload
            accept="image/png,image/jpeg,.png,.jpg,.jpeg"
            maxCount={1}
            beforeUpload={(file) => {
              const allowed = file?.type === 'image/png' || file?.type === 'image/jpeg';
              if (!allowed) {
                message.error('Avatar must be a PNG or JPG image.');
                return Upload.LIST_IGNORE;
              }
              return false;
            }}
            fileList={avatarFileList}
            onChange={({ fileList }) => setAvatarFileList(fileList)}
            listType="picture"
          >
            <Button>Select avatar file</Button>
          </Upload>
        </Form.Item>

        <Form.Item label="CV (optional)">
          <Upload
            accept="application/pdf,.pdf"
            maxCount={1}
            beforeUpload={() => false}
            fileList={cvFileList}
            onChange={({ fileList }) => setCvFileList(fileList)}
          >
            <Button>Select CV file</Button>
          </Upload>
        </Form.Item>

        <Form.Item name="password" label="Password">
          <Input.Password />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            Update User
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default UpdateUserPage;
