import React, { useEffect, useState } from "react";
import {
  Form,
  Input,
  Button,
  Upload,
  InputNumber,
  Select,
  notification,
  Spin,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";

import finalReportApi from "../../API/FinalReportAPI";
import userApi from "../../API/UserAPI";
import jobPositionApi from "../../API/JobPositionAPI";
import semesterApi from "../../API/SemesterAPI";

const { Option } = Select;

export default function CompanyCreateFinalReport() {
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);

  const [students, setStudents] = useState([]);
  const [jobPositions, setJobPositions] = useState([]);
  const [activeSemester, setActiveSemester] = useState(null);

  // ===================== LOAD DATA =====================
  const fetchData = async () => {
    setLoading(true);
    try {
      const [userRes, jobRes, semesterRes] = await Promise.all([
        userApi.getAll(),
        jobPositionApi.getAll(),
        semesterApi.getAll(),
      ]);

      /* ================= STUDENT (roleId = 3) ================= */
      const allUsers = userRes.data.data || [];
      const studentOnly = allUsers.filter(
        (u) => u.userId === 3
      );
      setStudents(studentOnly);

      /* ================= JOB POSITION ================= */
      setJobPositions(jobRes.data.data || []);

      /* ================= ACTIVE SEMESTER ================= */
      const semesters = semesterRes.data.data || [];
      const active = semesters.find((s) => s.isActive === true);

      if (!active) {
        notification.error({
          message: "Không có học kỳ đang hoạt động",
        });
        return;
      }

      setActiveSemester(active);

      // set semester name để hiển thị
      form.setFieldsValue({
        semesterName: active.name,
      });
    } catch (err) {
      notification.error({
        message: "Lỗi tải dữ liệu",
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ===================== UPLOAD =====================
  const handleUpload = (file) => {
    setPdfFile(file);
    return false;
  };

  // ===================== SUBMIT =====================
  const onFinish = async (values) => {
    try {
      if (!activeSemester) {
        notification.error({ message: "Chưa có học kỳ active" });
        return;
      }

      const formData = new FormData();
      formData.append("UserId", values.userId);
      formData.append("JobPositionId", values.jobPositionId);
      formData.append("SemesterId", activeSemester.semesterId); // 🔥 gửi ID
      formData.append("CompanyFeedback", values.companyFeedback);
      formData.append("CompanyRating", values.companyRating);
      formData.append("CompanyEvaluator", values.companyEvaluator);

      if (pdfFile) {
        formData.append("File", pdfFile);
      }

      await finalReportApi.create(formData);

      notification.success({
        message: "Company chấm điểm thành công",
      });

      form.resetFields();
      setPdfFile(null);

      form.setFieldsValue({
        semesterName: activeSemester.name,
      });
    } catch (err) {
      notification.error({
        message: "Chấm điểm thất bại",
        description:
          err?.response?.data?.message ||
          err?.response?.data ||
          "Lỗi không xác định",
      });
    }
  };

  // ===================== RENDER =====================
  return (
    <Spin spinning={loading}>
      <div style={{ padding: 24, maxWidth: 700 }}>
        <h2>Company chấm điểm sinh viên</h2>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
        >
          {/* ===== STUDENT (roleId = 3) ===== */}
          <Form.Item
            label="Sinh viên"
            name="userId"
            rules={[{ required: true, message: "Chọn sinh viên" }]}
          >
            <Select placeholder="Chọn sinh viên">
              {students.map((u) => (
                <Option key={u.userId} value={u.userId}>
                  {u.fullname}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* ===== JOB POSITION ===== */}
          <Form.Item
            label="Vị trí thực tập"
            name="jobPositionId"
            rules={[{ required: true, message: "Chọn vị trí" }]}
          >
            <Select placeholder="Chọn vị trí thực tập">
              {jobPositions.map((jp) => (
                <Option
                  key={jp.jobPositionId}
                  value={jp.jobPositionId}
                >
                  {jp.jobTitle}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* ===== SEMESTER NAME (READ ONLY) ===== */}
          <Form.Item label="Học kỳ" name="semesterName">
            <Input disabled />
          </Form.Item>

          {/* ===== COMPANY FEEDBACK ===== */}
          <Form.Item
            label="Nhận xét của công ty"
            name="companyFeedback"
            rules={[{ required: true, message: "Nhập nhận xét" }]}
          >
            <Input.TextArea rows={4} />
          </Form.Item>

          {/* ===== COMPANY RATING ===== */}
          <Form.Item
            label="Điểm đánh giá"
            name="companyRating"
            rules={[{ required: true, message: "Nhập điểm" }]}
          >
            <InputNumber
              min={0}
              max={10}
              style={{ width: "100%" }}
            />
          </Form.Item>

          {/* ===== EVALUATOR ===== */}
          <Form.Item
            label="Người đánh giá"
            name="companyEvaluator"
            rules={[
              { required: true, message: "Nhập tên người đánh giá" },
            ]}
          >
            <Input />
          </Form.Item>

          {/* ===== FILE ===== */}
          <Form.Item label="File đính kèm (PDF)">
            <Upload
              beforeUpload={handleUpload}
              maxCount={1}
              accept=".pdf"
            >
              <Button icon={<UploadOutlined />}>
                Chọn file PDF
              </Button>
            </Upload>
          </Form.Item>

          <Button type="primary" htmlType="submit">
            Chấm điểm
          </Button>
        </Form>
      </div>
    </Spin>
  );
}
