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
import companySemesterApi from "../../API/CompanySemesterAPI";

const { Option } = Select;

const isDebugEnabled = () => {
  try {
    return (
      process.env.NODE_ENV !== "production" ||
      localStorage.getItem("debug_semester_company") === "1"
    );
  } catch (_) {
    return process.env.NODE_ENV !== "production";
  }
};

const debugLog = (...args) => {
  if (!isDebugEnabled()) return;
  // eslint-disable-next-line no-console
  console.log("[CreateJobPosition]", ...args);
};

export default function CreateJobPosition() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const [activeSemester, setActiveSemester] = useState(null);
  const [majors, setMajors] = useState([]);
  const [semesterCompanies, setSemesterCompanies] = useState([]);
  const [canCreate, setCanCreate] = useState(true);

  const resolveSemesterCompanyId = (sc) =>
    sc?.semesterCompanyId ?? sc?.semesterCompanyID ?? sc?.id ?? sc?.Id;

  const resolveSemesterId = (sc) =>
    sc?.semesterId ?? sc?.semesterID ?? sc?.semester?.semesterId;

  const resolveCompanyId = (sc) =>
    sc?.companyId ??
    sc?.companyID ??
    sc?.company_ID ??
    sc?.company?.companyId ??
    sc?.company?.company_ID;

  const getCompanyIdFromStorage = () => {
    const raw = localStorage.getItem("company_id");
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };

  const isApproved = (sc) => Boolean(sc?.approvedAt);

  // ================= LOAD DATA =================
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const companyId = getCompanyIdFromStorage();
        debugLog("loadData() start", { companyId });

        const [semesterRes, majorRes, semesterCompanyRes] = await Promise.all([
          semesterApi.getAll(),
          majorApi.getAll(),
          companyId ? companySemesterApi.getByCompany(companyId) : companySemesterApi.getAll(),
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
        debugLog("Active semester", { semesterId: active?.semesterId, active });

        // -------- SEMESTER COMPANY LIST --------
        const scList =
          semesterCompanyRes?.data?.data || semesterCompanyRes?.data || [];
        debugLog("Raw semester-company list", { count: scList.length, scList });

        const filteredSc = scList.filter((sc) => {
          const semesterId = resolveSemesterId(sc);
          const scCompanyId = resolveCompanyId(sc);
          const matchSemester = semesterId === active?.semesterId;
          const matchCompany = companyId ? scCompanyId === companyId : true;
          return matchSemester && matchCompany;
        });

        debugLog("Filtered by active semester + company", {
          activeSemesterId: active?.semesterId,
          companyId,
          count: filteredSc.length,
          filteredSc,
        });

        const approvedForActive = filteredSc.filter(isApproved);
        setSemesterCompanies(approvedForActive.length ? approvedForActive : filteredSc);
        setCanCreate(approvedForActive.length > 0);
        debugLog("Approved semester-company for active semester", {
          approvedCount: approvedForActive.length,
          canCreate: approvedForActive.length > 0,
          approvedForActive,
        });

        // -------- MAJOR LIST --------
        setMajors(majorRes?.data?.data || majorRes?.data || []);

        // default values
        form.setFieldsValue({
          isActive: true,
        });

        // Default semesterCompanyId if we can infer it
        const preferred = approvedForActive.length ? approvedForActive : filteredSc;
        if (preferred.length === 1) {
          const onlyId = resolveSemesterCompanyId(preferred[0]);
          if (onlyId != null) {
            form.setFieldsValue({ semesterCompanyId: onlyId });
          }
        }
      } catch (err) {
        notification.error({
          message: "Lỗi tải dữ liệu",
        });
        debugLog("loadData() error", {
          status: err?.response?.status,
          data: err?.response?.data,
          message: err?.message,
        });
      } finally {
        setLoading(false);
        debugLog("loadData() done");
      }
    };

    loadData();
  }, [form]);

  // ================= SUBMIT =================
  const onFinish = async (values) => {
    try {
      setLoading(true);

      debugLog("onFinish values", values);

      if (!canCreate) {
        notification.warning({
          message: "Chưa được duyệt vào học kỳ",
          description: "Vui lòng gửi yêu cầu vào Semester Company và chờ Staff duyệt trước khi tạo Job Position.",
        });
        debugLog("onFinish blocked: canCreate=false");
        return;
      }

      const payload = {
        majorId: values.majorId, // ✅ gửi ID
        semesterId: activeSemester.semesterId,
        semesterCompanyId: values.semesterCompanyId,
        jobTitle: values.jobTitle,
        requirements: values.requirements,
        benefit: values.benefit,
        location: values.location,
        salaryRange: values.salaryRange,
        isActive: values.isActive,
      };

      await jobPositionApi.create(payload);
      debugLog("jobPositionApi.create success", payload);

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
      debugLog("jobPositionApi.create error", {
        payload: values,
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
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

        {!canCreate && (
          <div style={{ marginBottom: 12, color: "#b45309" }}>
            Bạn chưa có Semester Company được duyệt cho học kỳ đang hoạt động. Hãy vào mục Semester Company để gửi yêu cầu.
          </div>
        )}

        <Form layout="vertical" form={form} onFinish={onFinish} disabled={!canCreate}>
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

          {/* ===== SEMESTER COMPANY ===== */}
          <Form.Item
            label="Semester Company"
            name="semesterCompanyId"
            rules={[{ required: true, message: "Chọn semester company" }]}
          >
            <Select placeholder="Chọn SemesterCompanyId">
              {semesterCompanies.map((sc) => {
                const id = resolveSemesterCompanyId(sc);
                const semesterId = resolveSemesterId(sc);
                const companyId = resolveCompanyId(sc);
                return (
                  <Option key={id} value={id}>
                    {`ID: ${id} (semesterId: ${semesterId ?? "-"}, companyId: ${companyId ?? "-"})`}
                  </Option>
                );
              })}
            </Select>
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

          <Button type="primary" htmlType="submit" disabled={!canCreate}>
            Tạo Job
          </Button>
        </Form>
      </div>
    </Spin>
  );
}
