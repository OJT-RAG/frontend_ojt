import React, { useState, useEffect } from "react";
import { Form, Input, Button, Upload, InputNumber, notification } from "antd";
import { UploadOutlined, DeleteOutlined } from "@ant-design/icons";
import finalReportApi from "../../API/FinalReportAPI";

import { Worker, Viewer } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

import "./FinalReport.css";

const FinalReportPage = () => {
  const [form] = Form.useForm();
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const layoutPlugin = defaultLayoutPlugin();

  // Lấy thông tin từ localStorage
  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
  const userId = userInfo?.userId ?? null;
  const jobPositionId = userInfo?.jobPositionId ?? null;
  const semesterId = userInfo?.semesterId ?? null;

  // Các field công ty chỉ xem
  const companyFeedback = userInfo?.companyFeedback ?? "";
  const companyRating = userInfo?.companyRating ?? null;
  const companyEvaluator = userInfo?.companyEvaluator ?? "";

  const handleUpload = (file) => {
    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    setPdfFile(file);
    return false; // prevent auto upload
  };

  const handleRemove = () => {
    setPdfFile(null);
    setPdfUrl(null);
    form.resetFields();
  };

  const onFinish = async (values) => {
  setLoading(true);

  try {
    if (!userId || !values.jobPositionId || !values.semesterId) {
      notification.error({
        message: "Thiếu thông tin bắt buộc",
      });
      return;
    }

    const formData = new FormData();

    // ✅ CHỈ GỬI FIELD SINH VIÊN
    formData.append("UserId", userId);
    formData.append("JobPositionId", values.jobPositionId);
    formData.append("SemesterId", values.semesterId);
    formData.append(
      "StudentReportText",
      values.studentReportText ?? ""
    );

    // ✅ ĐÚNG KEY FILE
    if (pdfFile) {
      formData.append("StudentReportFile", pdfFile);
    }

    await finalReportApi.create(formData);

    notification.success({ message: "Gửi báo cáo thành công!" });
    handleRemove();
  } catch (err) {
    notification.error({
      message: "Gửi thất bại",
      description:
        err?.response?.data?.message ||
        err?.response?.data ||
        "Không thể gửi báo cáo",
    });
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    // Set giá trị mặc định cho form
    form.setFieldsValue({
      jobPositionId: jobPositionId ?? "",
      semesterId: semesterId ?? "",
      companyFeedback,
      companyRating,
      companyEvaluator,
    });
  }, [form, jobPositionId, semesterId, companyFeedback, companyRating, companyEvaluator]);

  return (
    <div className="final-report-wrapper">
      <h2 className="final-report-header">Nộp Báo Cáo Cuối Kỳ</h2>

      <Upload
        beforeUpload={handleUpload}
        maxCount={1}
        accept=".pdf"
        showUploadList={false}
      >
        <Button icon={<UploadOutlined />}>Chọn file PDF</Button>
      </Upload>

      {pdfFile && (
        <div className="file-info">
          <span>{pdfFile.name}</span>
          <Button type="link" icon={<DeleteOutlined />} onClick={handleRemove} />
        </div>
      )}

      <div className="content-container">
        <div className="left-panel">
          <Form form={form} layout="vertical" onFinish={onFinish}>
            <Form.Item label="Job Position ID" name="jobPositionId">
              <Input type="number" placeholder="Nhập Job Position ID" />
            </Form.Item>

            <Form.Item label="Semester ID" name="semesterId">
              <Input type="number" placeholder="Nhập Semester ID" />
            </Form.Item>

            <Form.Item
              label="Mô tả / Tóm tắt báo cáo"
              name="studentReportText"
            >
              <Input.TextArea rows={6} placeholder="Nhập nội dung báo cáo..." />
            </Form.Item>

            {/* Các field công ty chỉ xem */}
            <Form.Item label="Phản hồi công ty" name="companyFeedback">
              <Input.TextArea rows={3} disabled />
            </Form.Item>

            <Form.Item label="Đánh giá công ty" name="companyRating">
              <InputNumber min={0} max={10} disabled style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item label="Người đánh giá" name="companyEvaluator">
              <Input disabled />
            </Form.Item>

            <Button type="primary" htmlType="submit" loading={loading}>
              Gửi Báo Cáo
            </Button>
          </Form>
        </div>

        <div className="right-panel">
          {pdfUrl ? (
            <div className="pdf-viewer">
              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                <Viewer key={pdfUrl} fileUrl={pdfUrl} plugins={[layoutPlugin]} />
              </Worker>
            </div>
          ) : (
            <div className="empty-viewer">Chưa có file PDF</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinalReportPage;
