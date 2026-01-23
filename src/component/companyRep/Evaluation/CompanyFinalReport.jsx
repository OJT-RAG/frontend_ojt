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
import jobApplicationApi from "../../API/JobApplicationAPI";
import companySemesterApi from "../../API/CompanySemesterAPI";

import finalReportApi from "../../API/FinalReportAPI";
import userApi from "../../API/UserAPI";
import jobPositionApi from "../../API/JobPositionAPI";
import semesterApi from "../../API/SemesterAPI";

const { Option } = Select;

export default function CompanyCreateFinalReport() {
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const filterJobPositionsForCompany = (list, scList, companyId) => {
  const companyIdNum = Number(companyId);
  if (!companyIdNum) return [];

  const scCompanyIdByScId = new Map();

  for (const sc of scList || []) {
    const scId = Number(resolveSemesterCompanyId(sc));
    const scCompanyId = Number(resolveCompanyId(sc));

    if (scId && scCompanyId) {
      scCompanyIdByScId.set(scId, scCompanyId);
    }
  }

  return (list || []).filter((jp) => {
    const directCompanyId = Number(resolveJobPositionCompanyId(jp));
    if (directCompanyId) {
      return directCompanyId === companyIdNum;
    }

    const scId = Number(resolveJobPositionSemesterCompanyId(jp));
    return scCompanyIdByScId.get(scId) === companyIdNum;
  });
};

  const [students, setStudents] = useState([]);
  const [jobPositions, setJobPositions] = useState([]);
  const [activeSemester, setActiveSemester] = useState(null);
  const [studentJobMap, setStudentJobMap] = useState({});

  const isStudentUser = (u) => {
    if (!u) return false;
    if (u.roleId != null && Number(u.roleId) === 3) return true;
    const roleText = String(u.role ?? u.roleName ?? "").toLowerCase();
    return roleText === "student";
  };
  const handleStudentChange = (userId) => {
  const jobPositionId = studentJobMap[userId];

  if (jobPositionId) {
    form.setFieldsValue({
      jobPositionId,
    });
  } else {
    form.setFieldsValue({
      jobPositionId: undefined,
    });
  }
};
  // ===================== LOAD DATA =====================
  const fetchData = async () => {
  setLoading(true);
  try {
    const companyId = getCompanyIdFromStorage();
    if (!companyId) return;

    const [
      appRes,
      userRes,
      jobRes,
      semesterRes,
      scRes,
      reportRes, // ✅ BẮT REPORT
    ] = await Promise.all([
      jobApplicationApi.getAll(),
      userApi.getAll(),
      jobPositionApi.getAll(),
      semesterApi.getAll(),
      companySemesterApi.getByCompany(companyId).catch(() => ({ data: { data: [] } })),
      finalReportApi.getAll(),
    ]);

    const apps = appRes?.data?.data || [];
    const users = userRes?.data?.data || [];
    const allJobPositions = jobRes?.data?.data || [];
    const semesters = semesterRes?.data?.data || [];
    const semesterCompanies = scRes?.data?.data || [];
    const reports = reportRes?.data?.data || [];

    const active = semesters.find((s) => s.isActive);
    if (!active) {
      notification.error({ message: "Không có học kỳ đang hoạt động" });
      return;
    }

    setActiveSemester(active);
    form.setFieldsValue({ semesterName: active.name });

    // ===== Job positions của company =====
    const visibleJobPositions = filterJobPositionsForCompany(
      allJobPositions,
      semesterCompanies,
      companyId
    );
    setJobPositions(visibleJobPositions);

    const allowedJobPositionIds = new Set(
      visibleJobPositions.map(resolveJobPositionId)
    );

    // ===== Application accepted =====
    const acceptedApps = apps.filter(
      (a) =>
        a.status === "accepted" &&
        allowedJobPositionIds.has(a.jobPositionId)
    );

    // ===== Map student -> job =====
    const map = {};
    acceptedApps.forEach((app) => {
      map[app.userId] = app.jobPositionId;
    });
    setStudentJobMap(map);

    const acceptedUserIds = new Set(acceptedApps.map((a) => a.userId));

    // ===== 🔥 USER ĐÃ ĐƯỢC CHẤM =====
    const gradedUserIds = new Set(
  reports
    .filter((r) => {
      const semesterId = resolveReportSemesterId(r);
      const reportUserId = resolveReportUserId(r);
      const reportJobId =
        r?.jobPositionId ?? r?.jobPosition?.jobPositionId;

      if (Number(semesterId) !== Number(active.semesterId)) return false;

      // ✅ check company chuẩn
      const cId = resolveReportCompanyId(r);
      if (cId && Number(cId) === Number(companyId)) return true;

      // ⚠️ PHÒNG THỦ: dùng map LOCAL
      return (
        Number(reportUserId) &&
        Number(reportJobId) &&
        Number(map[reportUserId]) === Number(reportJobId)
      );
    })
    .map(resolveReportUserId)
);



    // ===== 🔥 CHỈ LẤY STUDENT CHƯA ĐƯỢC CHẤM =====
    const acceptedStudents = users.filter((u) => {
      const uid = resolveUserId(u);
      return (
        acceptedUserIds.has(uid) &&
        isStudentUser(u) &&
        !gradedUserIds.has(uid)
      );
    });

    setStudents(acceptedStudents);
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


  const getCompanyIdFromStorage = () => {
  const raw = localStorage.getItem("company_id");
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};


const resolveUserId = (u) => u?.userId ?? u?.id ?? u?.UserId;
const normalizeRole = (role) => String(role || "").toLowerCase();
const resolveReportUserId = (r) =>
  r?.userId ?? r?.user?.userId;

const resolveReportSemesterId = (r) =>
  r?.semesterId ??
  r?.semester?.semesterId ??
  r?.SemesterId;

const resolveReportCompanyId = (r) =>
  r?.companyId ??
  r?.company?.companyId ??
  r?.CompanyId;

const resolveJobPositionId = (jp) =>
  jp?.jobPositionId ?? jp?.jobPositionID ?? jp?.jobPositionid;

const resolveJobPositionCompanyId = (jp) =>
  jp?.companyId ??
  jp?.companyID ??
  jp?.company_ID ??
  jp?.company_id ??
  jp?.company?.companyId;

const resolveJobPositionSemesterCompanyId = (jp) =>
  jp?.semesterCompanyId ??
  jp?.semesterCompanyID ??
  jp?.semesterCompanyid;

const resolveSemesterCompanyId = (sc) =>
  sc?.semesterCompanyId ?? sc?.semesterCompanyID ?? sc?.id ?? sc?.Id;

const resolveCompanyId = (sc) =>
  sc?.companyId ??
  sc?.companyID ??
  sc?.company_ID ??
  sc?.company?.companyId ??
  sc?.company?.company_ID;

  // ===================== SUBMIT =====================
  const onFinish = async (values) => {
    const companyId = getCompanyIdFromStorage();
if (!companyId) {
  notification.error({ message: "Không xác định được công ty" });
  return;
}
    try {
      if (!activeSemester) {
        notification.error({ message: "Chưa có học kỳ active" });
        return;
      }

      const formData = new FormData();
      formData.append("UserId", values.userId);
      formData.append("JobPositionId", values.jobPositionId);
      formData.append("SemesterId", activeSemester.semesterId); // 🔥 gửi ID
      formData.append("CompanyId", companyId); // 🔥🔥🔥 BẮT BUỘC
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
    await fetchData();

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
  <Select
    placeholder="Chọn sinh viên"
    onChange={handleStudentChange}
  >
    {students.map((u) => {
      const uid = resolveUserId(u);
      return (
        <Option key={uid} value={uid}>
          {u.fullname}
        </Option>
      );
    })}
  </Select>
</Form.Item>



          {/* ===== JOB POSITION ===== */}
          <Form.Item
  label="Vị trí thực tập"
  name="jobPositionId"
  rules={[{ required: true, message: "Chọn vị trí" }]}
>
  <Select disabled placeholder="Vị trí thực tập">
    {jobPositions.map((jp) => {
      const jpId = resolveJobPositionId(jp);
      return (
        <Option key={jpId} value={jpId}>
          {jp.jobTitle}
        </Option>
      );
    })}
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
