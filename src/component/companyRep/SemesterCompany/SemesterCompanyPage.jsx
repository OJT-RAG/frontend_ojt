import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, Form, Select, Table, Tag, message, Popconfirm, Alert } from "antd";
import semesterApi from "../../API/SemesterAPI";
import companySemesterApi from "../../API/CompanySemesterAPI";

const resolveSemesterId = (sc) => sc?.semesterId ?? sc?.semesterID;
const resolveCompanyId = (sc) => sc?.companyId ?? sc?.companyID ?? sc?.company_ID;
const resolveSemesterCompanyId = (sc) => sc?.semesterCompanyId ?? sc?.semesterCompanyID ?? sc?.id ?? sc?.Id;

const isApproved = (sc) => Boolean(sc?.approvedAt);

const getCompanyIdFromStorage = () => {
  const raw = localStorage.getItem("company_id");
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

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
  console.log("[SemesterCompanyPage]", ...args);
};

export default function SemesterCompanyPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [semesters, setSemesters] = useState([]);
  const [records, setRecords] = useState([]);

  const companyId = useMemo(() => getCompanyIdFromStorage(), []);

  const semesterNameById = useMemo(() => {
    const map = new Map();
    for (const s of semesters) {
      const id = s?.semesterId ?? s?.semesterID;
      if (id != null) map.set(id, s?.name ?? s?.semesterName ?? `Semester ${id}`);
    }
    return map;
  }, [semesters]);

  const existingSemesterIds = useMemo(() => {
    const set = new Set();
    for (const r of records) {
      const sid = resolveSemesterId(r);
      if (sid != null) set.add(sid);
    }
    return set;
  }, [records]);

  const availableSemesterOptions = useMemo(() => {
    return semesters
      .map((s) => ({
        id: s?.semesterId ?? s?.semesterID,
        name: s?.name ?? s?.semesterName ?? "-",
        isActive: s?.isActive === true,
      }))
      .filter((s) => s.id != null)
      .filter((s) => !existingSemesterIds.has(s.id));
  }, [semesters, existingSemesterIds]);

  const fetchAll = async () => {
    debugLog("fetchAll() start", { companyId });
    setLoading(true);
    try {
      const [semesterRes, companySemRes] = await Promise.all([
        semesterApi.getAll(),
        companyId ? companySemesterApi.getByCompany(companyId) : Promise.resolve({ data: { data: [] } }),
      ]);

      const semesterList = Array.isArray(semesterRes?.data)
        ? semesterRes.data
        : semesterRes?.data?.data || [];
      setSemesters(semesterList);
      debugLog("Loaded semesters", { count: semesterList.length });

      const list = Array.isArray(companySemRes?.data)
        ? companySemRes.data
        : companySemRes?.data?.data || [];

      setRecords(list);
      debugLog("Loaded company semester-company records", { count: list.length, list });

      // default select: active semester if not yet joined
      const active = semesterList.find((s) => s?.isActive === true);
      const activeId = active?.semesterId ?? active?.semesterID;
      debugLog("Active semester", { activeId, active });
      if (activeId && !existingSemesterIds.has(activeId)) {
        form.setFieldsValue({ semesterId: activeId });
        debugLog("Defaulted semesterId in form", { semesterId: activeId });
      }
    } catch (err) {
      console.error("Failed to load semester-company data:", err);
      debugLog("fetchAll() error", {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      });
      message.error("Không thể tải dữ liệu Semester Company");
    } finally {
      setLoading(false);
      debugLog("fetchAll() done");
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    if (!companyId) {
      message.error("Thiếu company_id trong localStorage");
      debugLog("handleCreate blocked: missing companyId");
      return;
    }

    try {
      const values = await form.validateFields();
      debugLog("handleCreate validated values", values);
      setLoading(true);

      await companySemesterApi.create({
        semesterId: values.semesterId,
        companyId,
      });

      message.success("Đã gửi yêu cầu vào học kỳ (Pending)");
      form.resetFields();
      await fetchAll();
    } catch (err) {
      if (err?.errorFields) return; // validation
      console.error("Create semester-company failed:", err);
      debugLog("handleCreate error", {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      });
      message.error(err?.response?.data?.message || "Gửi yêu cầu thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (record) => {
    const id = resolveSemesterCompanyId(record);
    if (!id) return;

    try {
      setLoading(true);
      debugLog("handleDelete", { id, record });
      await companySemesterApi.delete(id);
      message.success("Đã xoá yêu cầu");
      await fetchAll();
    } catch (err) {
      console.error("Delete semester-company failed:", err);
      debugLog("handleDelete error", {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      });
      message.error("Xoá thất bại");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "semesterCompanyId",
      key: "semesterCompanyId",
      render: (_, r) => resolveSemesterCompanyId(r) ?? "-",
      width: 90,
    },
    {
      title: "Semester",
      key: "semesterId",
      render: (_, r) => {
        const sid = resolveSemesterId(r);
        return semesterNameById.get(sid) || sid || "-";
      },
    },
    {
      title: "Trạng thái",
      key: "status",
      render: (_, r) => (isApproved(r) ? <Tag color="green">Approved</Tag> : <Tag color="gold">Pending</Tag>),
      width: 140,
    },
    {
      title: "Approved At",
      key: "approvedAt",
      render: (_, r) => (r?.approvedAt ? new Date(r.approvedAt).toLocaleString() : "-"),
    },
    {
      title: "Actions",
      key: "actions",
      width: 140,
      render: (_, r) => {
        const disabled = isApproved(r);
        return (
          <Popconfirm
            title="Xoá yêu cầu này?"
            okText="Xoá"
            cancelText="Huỷ"
            onConfirm={() => handleDelete(r)}
            disabled={disabled}
          >
            <Button danger disabled={disabled}>
              Delete
            </Button>
          </Popconfirm>
        );
      },
    },
  ];

  return (
    <div style={{ maxWidth: 1100 }}>
      <Card title="Semester Company" style={{ marginBottom: 16 }}>
        {!companyId && (
          <Alert
            type="warning"
            showIcon
            message="Không tìm thấy company_id"
            description="Trang này cần company_id trong localStorage (đăng nhập Company Rep)."
            style={{ marginBottom: 12 }}
          />
        )}

        <Form form={form} layout="inline">
          <Form.Item
            name="semesterId"
            label="Học kỳ"
            rules={[{ required: true, message: "Chọn học kỳ" }]}
          >
            <Select
              style={{ minWidth: 260 }}
              placeholder="Chọn học kỳ"
              loading={loading}
              options={availableSemesterOptions.map((s) => ({
                value: s.id,
                label: `${s.name}${s.isActive ? " (Active)" : ""}`,
              }))}
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" onClick={handleCreate} loading={loading} disabled={!companyId}>
              Gửi yêu cầu
            </Button>
          </Form.Item>

          <Form.Item>
            <Button onClick={fetchAll} loading={loading}>
              Refresh
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="Danh sách yêu cầu">
        <Table
          rowKey={(r) => resolveSemesterCompanyId(r) ?? JSON.stringify(r)}
          loading={loading}
          columns={columns}
          dataSource={records}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
}
