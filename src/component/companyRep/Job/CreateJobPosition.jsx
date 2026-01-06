import React, { useEffect, useState } from "react";
import {
  Form,
  Input,
  Button,
  Select,
  Switch,
  notification,
  Spin,
} from "antd";

import jobPositionApi from "../../API/JobPositionAPI";
import semesterApi from "../../API/SemesterAPI";
import majorApi from "../../API/MajorAPI";

const { Option } = Select;

export default function CreateJobPosition() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const [activeSemester, setActiveSemester] = useState(null);
  const [majors, setMajors] = useState([]);

  // ================= LOAD DATA =================
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [semesterRes, majorRes] = await Promise.all([
          semesterApi.getAll(),
          majorApi.getAll(),
        ]);

        // -------- SEMESTER ACTIVE --------
        const semesters = semesterRes?.data?.data || semesterRes?.data || [];
        const active = semesters.find((s) => s.isActive === true);

        if (!active) {
          notification.error({
            message: "Không có học kỳ đang hoạt động",
          });
          return;
        }

        setActiveSemester(active);

        // -------- MAJOR LIST --------
        setMajors(majorRes?.data?.data || majorRes?.data || []);

        // default values
        form.setFieldsValue({
          isActive: true,
        });
      } catch (err) {
        notification.error({
          message: "Lỗi tải dữ liệu",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [form]);

  // ================= SUBMIT =================
  const onFinish = async (values) => {
    try {
      setLoading(true);

      const payload = {
        majorId: values.majorId, // ✅ gửi ID
        semesterId: activeSemester.semesterId,
        jobTitle: values.jobTitle,
        requirements: values.requirements,
        benefit: values.benefit,
        location: values.location,
        salaryRange: values.salaryRange,
        isActive: values.isActive,
      };

      await jobPositionApi.create(payload);

      notification.success({
        message: "Tạo Job Position thành công",
      });

      form.resetFields();
      form.setFieldsValue({
        isActive: true,
      });
    } catch (err) {
      notification.error({
        message: "Tạo job thất bại",
        description:
          err?.response?.data?.message ||
          err?.response?.data ||
          "Lỗi không xác định",
      });
    } finally {
      setLoading(false);
    }
  };

  // ================= UI =================
  return (
    <Spin spinning={loading}>
      <div style={{ maxWidth: 700, padding: 24 }}>
        <h2>Tạo Job Position</h2>

        <Form layout="vertical" form={form} onFinish={onFinish}>
          {/* ===== MAJOR (TITLE) ===== */}
          <Form.Item
            label="Ngành học"
            name="majorId"
            rules={[{ required: true, message: "Chọn ngành học" }]}
          >
            <Select placeholder="Chọn ngành">
              {majors.map((m) => (
                <Option key={m.majorId} value={m.majorId}>
                  {m.majorTitle}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* ===== SEMESTER (NAME ONLY) ===== */}
          <Form.Item label="Học kỳ">
            <Input value={activeSemester?.name} disabled />
          </Form.Item>

          {/* ===== JOB TITLE ===== */}
          <Form.Item
            label="Tên vị trí"
            name="jobTitle"
            rules={[{ required: true, message: "Nhập tên vị trí" }]}
          >
            <Input />
          </Form.Item>

          {/* ===== REQUIREMENTS ===== */}
          <Form.Item
            label="Yêu cầu"
            name="requirements"
            rules={[{ required: true, message: "Nhập yêu cầu" }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          {/* ===== BENEFIT ===== */}
          <Form.Item
            label="Quyền lợi"
            name="benefit"
            rules={[{ required: true, message: "Nhập quyền lợi" }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          {/* ===== LOCATION ===== */}
          <Form.Item
            label="Địa điểm"
            name="location"
            rules={[{ required: true, message: "Nhập địa điểm" }]}
          >
            <Input />
          </Form.Item>

          {/* ===== SALARY ===== */}
          <Form.Item
            label="Mức lương"
            name="salaryRange"
            rules={[{ required: true, message: "Nhập mức lương" }]}
          >
            <Input />
          </Form.Item>

          {/* ===== ACTIVE ===== */}
          <Form.Item
            label="Trạng thái"
            name="isActive"
            valuePropName="checked"
          >
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>

          <Button type="primary" htmlType="submit">
            Tạo Job
          </Button>
        </Form>
      </div>
    </Spin>
  );
}
