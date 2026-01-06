import React, { useState, useEffect } from "react";
import { Form, Input, Button, DatePicker, message } from "antd";
import moment from "moment";
import userApi from "../../API/UserAPI";
import "./UpdateUserProfile.css";

const UpdateUserPage = ({ userId = 0 }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

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
      const payload = {
        ...values,
        dob: values.dob ? values.dob.format("YYYY-MM-DD") : null,
      };

      await userApi.update(payload); // gọi api từ userApi
      message.success("User updated successfully!");
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
    initialValues={{ userId: resolvedUserId, majorId: 0, companyId: 0 }}
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

        <Form.Item name="avatarUrl" label="Avatar URL">
          <Input />
        </Form.Item>

        <Form.Item name="cvUrl" label="CV URL">
          <Input />
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
