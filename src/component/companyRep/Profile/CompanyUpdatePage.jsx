import React, { useState } from "react";
import { Form, Input, Button, Upload, InputNumber, Card, notification, Switch } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import companyApi from "../../API/CompanyAPI";

const CompanyUpdatePage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const normFile = (e) => e?.fileList ?? [];

  const onFinish = async (values) => {
    setLoading(true);

    const formData = new FormData();

    formData.append("company_ID", values.company_ID);
    formData.append("majorID", values.majorID ?? "");
    formData.append("name", values.name);
    formData.append("tax_Code", values.tax_Code);
    formData.append("address", values.address);
    formData.append("website", values.website);
    formData.append("contact_Email", values.contact_Email);
    formData.append("phone", values.phone);
    formData.append("is_Verified", values.is_Verified);

    // Thêm logo nếu có upload mới
    const file = values.logo_URL?.[0]?.originFileObj;
    if (file) {
      formData.append("logo_URL", file, file.name);
    }

    try {
      await companyApi.update(formData);

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
}
 finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Cập Nhật Thông Tin Công Ty" style={{ maxWidth: 700, margin: "auto" }}>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        
        <Form.Item name="company_ID" label="Company ID" rules={[{ required: true }]}>
          <InputNumber style={{ width: "100%" }} placeholder="Nhập ID công ty cần update" />
        </Form.Item>

        <Form.Item name="majorID" label="Major ID">
          <InputNumber style={{ width: "100%" }} placeholder="Major ID (có thể null)" />
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

        <Form.Item 
          name="logo_URL" 
          label="Logo Công Ty (Tải lên mới nếu muốn)"
          valuePropName="fileList"
          getValueFromEvent={normFile}
        >
          <Upload beforeUpload={() => false} maxCount={1} accept=".png,.jpg,.jpeg">
            <Button icon={<UploadOutlined />}>Chọn Logo</Button>
          </Upload>
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
