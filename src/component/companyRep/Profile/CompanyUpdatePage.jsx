import React, { useState } from "react";
import { Form, Input, Button, InputNumber, Card, notification, Switch } from "antd";
import companyApi from "../../API/CompanyAPI";

const CompanyUpdatePage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);

    const payload = {
      company_ID: Number(values.company_ID),
      name: String(values.name || "").trim(),
      tax_Code: String(values.tax_Code || "").trim(),
      address: String(values.address || "").trim(),
      website: String(values.website || "").trim(),
      contact_Email: String(values.contact_Email || "").trim(),
      phone: String(values.phone || "").trim(),
      logo_URL: String(values.logo_URL || "").trim(),
      is_Verified: !!values.is_Verified,
    };

    try {
      await companyApi.update(payload);

      notification.success({
        message: "Cập nhật thành công",
        description: "Thông tin công ty đã được cập nhật."
      });

      form.resetFields();
    } catch (error) {
      notification.error({
        message: "Cập nhật thất bại",
        description: error.response?.data?.message || "Không thể kết nối API",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Cập Nhật Thông Tin Công Ty" style={{ maxWidth: 700, margin: "auto" }}>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        
        <Form.Item name="company_ID" label="Company ID" rules={[{ required: true }]}>
          <InputNumber style={{ width: "100%" }} placeholder="Nhập ID công ty cần update" />
        </Form.Item>

        <Form.Item name="name" label="Tên Công Ty" rules={[{ required: true }]}>
          <Input />
        </Form.Item>

        <Form.Item name="tax_Code" label="Mã Số Thuế" rules={[{ required: true }]}>
          <Input />
        </Form.Item>

        <Form.Item name="address" label="Địa Chỉ" rules={[{ required: true }]}>
          <Input />
        </Form.Item>

        <Form.Item name="website" label="Website">
          <Input />
        </Form.Item>

        <Form.Item name="contact_Email" label="Email Liên Hệ">
          <Input type="email" />
        </Form.Item>

        <Form.Item name="phone" label="Số Điện Thoại">
          <Input />
        </Form.Item>

        <Form.Item name="logo_URL" label="Logo URL">
          <Input placeholder="https://..." />
        </Form.Item>

        <Form.Item name="is_Verified" label="Đã xác thực" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            Cập Nhật Công Ty
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default CompanyUpdatePage;
