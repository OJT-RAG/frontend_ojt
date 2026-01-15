import React, { useEffect, useMemo, useState } from "react";
import { Table, Input, Button, Card, Modal, Form, InputNumber, Popconfirm, Select, Switch, Tabs, Tag, message } from "antd";
import { RefreshCcw, Search, Plus, Pencil, Trash2, FileText } from "lucide-react";
import jobApi from "../../API/JobAPI";
import jobPositionApi from "../../API/JobPositionAPI";
import jobDescriptionApi from "../../API/JobDescriptionAPI";
import majorApi from "../../API/MajorAPI";
import semesterApi from "../../API/SemesterAPI";
import "./JobManagement.css";

const JobManagement = () => {
  const [jobs, setJobs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);

  const [jobPositions, setJobPositions] = useState([]);
  const [filteredPositions, setFilteredPositions] = useState([]);
  const [positionsLoading, setPositionsLoading] = useState(false);

  const [jobDescriptions, setJobDescriptions] = useState([]);
  const [filteredDescriptions, setFilteredDescriptions] = useState([]);
  const [descriptionsLoading, setDescriptionsLoading] = useState(false);

  const [majors, setMajors] = useState([]);
  const [semesters, setSemesters] = useState([]);

  const [activeTab, setActiveTab] = useState("positions");
  const [descriptionsByJobPositionId, setDescriptionsByJobPositionId] = useState({});
  const [messageApi, contextHolder] = message.useMessage();

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form] = Form.useForm();

  // Job position modal
  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false);
  const [editPosition, setEditPosition] = useState(null);
  const [positionForm] = Form.useForm();

  // Description modal state
  const [isDescModalOpen, setIsDescModalOpen] = useState(false);
  const [descLoading, setDescLoading] = useState(false);
  const [descEditJob, setDescEditJob] = useState(null);
  const [descExistingRecord, setDescExistingRecord] = useState(null);
  const [descForm] = Form.useForm();

  const fetchMajorsSemesters = async () => {
    try {
      const [majorRes, semesterRes] = await Promise.all([
        majorApi.getAll(),
        semesterApi.getAll(),
      ]);
      setMajors(majorRes.data?.data || []);
      setSemesters(semesterRes.data?.data || []);
    } catch (err) {
      console.error("Failed to fetch majors/semesters:", err);
    }
  };

  const fetchJobPositions = async () => {
    try {
      setPositionsLoading(true);
      const res = await jobPositionApi.getAll();
      const list = res.data?.data || [];
      setJobPositions(list);
      setFilteredPositions(list);
    } catch (err) {
      console.error("Failed to fetch job positions:", err);
    } finally {
      setPositionsLoading(false);
    }
  };

  const fetchDescriptions = async () => {
    try {
      setDescriptionsLoading(true);
      const res = await jobDescriptionApi.getAll();
      const list = res.data?.data || [];

      setJobDescriptions(list);
      setFilteredDescriptions(list);

      const map = {};
      for (const item of list) {
        const jobPositionId = item.jobPositionId ?? item.jobPositionID ?? item.jobPositionid;
        const text = item.jobDescription ?? item.description ?? item.jobDesc ?? "";
        if (jobPositionId != null) map[jobPositionId] = { ...item, _text: text };
      }

      setDescriptionsByJobPositionId(map);
    } catch (err) {
      // Not fatal; table can still show job titles
      console.error("Failed to fetch job descriptions:", err);
    } finally {
      setDescriptionsLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const jobRes = await jobApi.getAll();
      const list = jobRes.data?.data || [];
      setJobs(list);
      setFiltered(list);
      fetchDescriptions();
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([
      fetchJobs(),
      fetchJobPositions(),
      fetchMajorsSemesters(),
      fetchDescriptions(),
    ]);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const handleSearch = (value) => {
    const keyword = (value || "").toLowerCase();
    const result = jobs.filter((job) =>
      (job.jobTitle || "").toLowerCase().includes(keyword)
    );
    setFiltered(result);
  };

  const positionCountByJobTitle = useMemo(() => {
    const map = {};
    for (const jp of jobPositions) {
      const title = (jp?.jobTitle || "").trim();
      if (!title) continue;
      map[title] = (map[title] || 0) + 1;
    }
    return map;
  }, [jobPositions]);

  const handleSearchPositions = (value) => {
    const keyword = (value || "").toLowerCase();
    const result = jobPositions.filter((jp) =>
      (jp.jobTitle || "").toLowerCase().includes(keyword)
    );
    setFilteredPositions(result);
  };

  const jobTitleByPositionId = useMemo(() => {
    const map = {};
    for (const jp of jobPositions) {
      const id = jp?.jobPositionId ?? jp?.jobPositionID ?? jp?.jobPositionid;
      if (id == null) continue;
      map[id] = jp?.jobTitle || "-";
    }
    return map;
  }, [jobPositions]);

  const handleSearchDescriptions = (value) => {
    const keyword = (value || "").toLowerCase();
    const result = jobDescriptions.filter((d) => {
      const jobPositionId = d?.jobPositionId ?? d?.jobPositionID ?? d?.jobPositionid;
      const title = (jobTitleByPositionId[jobPositionId] || "").toLowerCase();
      const text = (d?.jobDescription ?? d?.description ?? d?.jobDesc ?? "").toLowerCase();
      return title.includes(keyword) || text.includes(keyword);
    });
    setFilteredDescriptions(result);
  };

  // -------------------------
  // CRUD FUNCTIONS
  // -------------------------

  const openCreateModal = () => {
    setEditData(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditData(record);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editData) {
        await jobApi.update(editData.jobTitleId, values);
      } else {
        await jobApi.create(values);
      }

      setIsModalOpen(false);
      fetchJobs();
    } catch (err) {
      console.error("Submit error:", err);
    }
  };

  const openCreatePositionModal = () => {
    setEditPosition(null);
    positionForm.resetFields();
    const activeSemester = semesters.find((s) => s.isActive === true) || semesters[0];
    positionForm.setFieldsValue({
      isActive: true,
      semesterId: activeSemester?.semesterId,
    });
    setIsPositionModalOpen(true);
  };

  const openEditPositionModal = (record) => {
    setEditPosition(record);
    const matchedJobTitle = jobs.find((j) => j.jobTitle === record.jobTitle);
    const normalized = {
      ...record,
      majorId: record.majorId ?? record.major?.majorId,
      semesterId: record.semesterId ?? record.semester?.semesterId,
      jobTitleId: matchedJobTitle?.jobTitleId,
    };
    positionForm.setFieldsValue(normalized);
    setIsPositionModalOpen(true);
  };

  const handleSubmitPosition = async () => {
    let payloadForDebug = null;
    try {
      const values = await positionForm.validateFields();

      const selectedJob = jobs.find((j) => j.jobTitleId === values.jobTitleId);
      if (!selectedJob) {
        messageApi.error("Please select a valid job title");
        return;
      }

      const activeSemester = semesters.find((s) => s.isActive === true) || semesters[0];
      const payload = {
        ...values,
        // ensure semesterId is always included (backend requires it)
        semesterId: values.semesterId ?? activeSemester?.semesterId,
        // backend expects jobTitle string; enforce selecting from job title list
        jobTitle: selectedJob.jobTitle,
      };

      // Do not send jobTitleId unless backend explicitly needs it
      delete payload.jobTitleId;

      payloadForDebug = payload;

      if (!payload.semesterId) {
        messageApi.error("Missing semesterId: please select a semester");
        return;
      }

      if (editPosition) {
        await jobPositionApi.update({
          ...payload,
          jobPositionId: editPosition.jobPositionId,
        });
        messageApi.success("Job position updated");
      } else {
        await jobPositionApi.create(payload);
        messageApi.success("Job position created");
      }

      setIsPositionModalOpen(false);
      setEditPosition(null);
      fetchJobPositions();
    } catch (err) {
      console.groupCollapsed("Job position submit error");
      console.error("Error:", err);
      console.log("Payload:", payloadForDebug);
      console.log("Status:", err?.response?.status);
      console.log("Response data:", err?.response?.data);
      console.log("Response headers:", err?.response?.headers);
      console.log("Request:", err?.request);
      console.groupEnd();
      messageApi.error("Failed to save job position");
    }
  };

  const handleDeletePosition = async (id) => {
    try {
      await jobPositionApi.delete(id);
      messageApi.success("Job position deleted");
      fetchJobPositions();
      fetchDescriptions();
    } catch (err) {
      console.error("Delete job position failed:", err);
      messageApi.error("Failed to delete job position");
    }
  };

  const openDescriptionModal = async (record) => {
    setIsDescModalOpen(true);
    setDescEditJob(record);
    setDescExistingRecord(null);
    descForm.resetFields();

    const defaultJobPositionId = record.jobPositionId;
    if (!defaultJobPositionId) {
      messageApi.warning("Please create/select a Job Position first");
      return;
    }

    const existingFromMap = descriptionsByJobPositionId[defaultJobPositionId];
    descForm.setFieldsValue({
      jobPositionId: defaultJobPositionId,
      jobDescription: existingFromMap?._text || "",
      hireQuantity: existingFromMap?.hireQuantity ?? 0,
      appliedQuantity: existingFromMap?.appliedQuantity ?? 0,
    });
    if (existingFromMap) setDescExistingRecord(existingFromMap);
  };

  const openCreateDescriptionModal = () => {
    setIsDescModalOpen(true);
    setDescEditJob(null);
    setDescExistingRecord(null);
    descForm.resetFields();
  };

  const openEditDescriptionModal = (record) => {
    const jobPositionId = record?.jobPositionId ?? record?.jobPositionID ?? record?.jobPositionid;
    const text = record?.jobDescription ?? record?.description ?? record?.jobDesc ?? record?._text ?? "";
    setIsDescModalOpen(true);
    setDescEditJob({ jobTitle: jobTitleByPositionId[jobPositionId] || "-" });
    setDescExistingRecord(record);
    descForm.resetFields();
    descForm.setFieldsValue({
      jobPositionId,
      jobDescription: text,
      hireQuantity: record?.hireQuantity ?? 0,
      appliedQuantity: record?.appliedQuantity ?? 0,
    });
  };

  const handleSubmitDescription = async () => {
    try {
      setDescLoading(true);
      const values = await descForm.validateFields();
      const existingRecord =
        descExistingRecord || descriptionsByJobPositionId[values.jobPositionId] || null;

      const existingId =
        existingRecord?.jobDescriptionId ??
        existingRecord?.jobDescriptionID ??
        existingRecord?.jobDescriptionid ??
        existingRecord?.jobDescId ??
        existingRecord?.jobDescID ??
        existingRecord?.id ??
        existingRecord?.Id;

      const payload = {
        jobPositionId: values.jobPositionId,
        jobDescription: values.jobDescription,
        hireQuantity: values.hireQuantity,
        appliedQuantity: values.appliedQuantity,
      };

      // Backend behavior: update requires existing record; otherwise it returns 404.
      if (existingId != null) {
        await jobDescriptionApi.update({ ...payload, jobDescriptionId: existingId });
        messageApi.success("Job description updated");
      } else {
        await jobDescriptionApi.create(payload);
        messageApi.success("Job description created");
      }

      setIsDescModalOpen(false);
      setDescEditJob(null);
      setDescExistingRecord(null);
      fetchDescriptions();
    } catch (err) {
      console.error("Description submit error:", err);
      messageApi.error("Failed to save job description");
    } finally {
      setDescLoading(false);
    }
  };

  const handleDeleteDescription = async (record) => {
    try {
      const id =
        record?.jobDescriptionId ??
        record?.jobDescriptionID ??
        record?.jobDescriptionid ??
        record?.id ??
        record?.Id;

      if (id == null) {
        messageApi.error("Missing jobDescriptionId");
        return;
      }

      await jobDescriptionApi.delete(id);
      messageApi.success("Job description deleted");
      fetchDescriptions();
    } catch (err) {
      console.error("Delete job description failed:", err);
      messageApi.error("Failed to delete job description");
    }
  };

  const handleDelete = async (id) => {
    try {
      await jobApi.delete(id);
      fetchJobs();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const columns = [
    { title: "ID", dataIndex: "jobTitleId", key: "id", width: 80 },
    { title: "Job Title", dataIndex: "jobTitle", key: "title" },
    {
      title: "Positions",
      key: "amount",
      width: 150,
      render: (_, record) => {
        const title = (record?.jobTitle || "").trim();
        return positionCountByJobTitle[title] ?? record?.positionAmount ?? 0;
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 180,
      render: (_, record) => (
        <div className="job-action-buttons">
          <Button
            type="primary"
            size="small"
            onClick={() => openEditModal(record)}
            icon={<Pencil size={14} />}
          >
            Update
          </Button>

          <Popconfirm
            title="Delete job?"
            description="Are you sure you want to delete this job title?"
            okText="Yes"
            cancelText="No"
            onConfirm={() => handleDelete(record.jobTitleId)}
          >
            <Button danger size="small" icon={<Trash2 size={14} />}>
              Delete
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  const getMajorTitle = (majorId) => majors.find((m) => m.majorId === majorId)?.majorTitle || "-";
  const getSemesterName = (semesterId) => semesters.find((s) => s.semesterId === semesterId)?.name || "-";

  const positionColumns = [
    { title: "ID", dataIndex: "jobPositionId", key: "jobPositionId", width: 80 },
    { title: "Job Title", dataIndex: "jobTitle", key: "jobTitle" },
    {
      title: "Major",
      dataIndex: "majorId",
      key: "majorId",
      render: (majorId) => getMajorTitle(majorId),
    },
    {
      title: "Semester",
      dataIndex: "semesterId",
      key: "semesterId",
      render: (semesterId) => getSemesterName(semesterId),
    },
    { title: "Location", dataIndex: "location", key: "location" },
    { title: "Salary", dataIndex: "salaryRange", key: "salaryRange" },
    {
      title: "Active",
      dataIndex: "isActive",
      key: "isActive",
      width: 90,
      render: (isActive) => (
        <Tag color={isActive ? "green" : "red"}>{isActive ? "Active" : "Inactive"}</Tag>
      ),
    },
    {
      title: "Description",
      key: "description",
      render: (_, record) => {
        const text = descriptionsByJobPositionId[record.jobPositionId]?._text;
        if (!text) return <span style={{ color: "#999" }}>—</span>;
        return (
          <span title={text}>
            {text.length > 60 ? `${text.slice(0, 60)}…` : text}
          </span>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 320,
      render: (_, record) => (
        <div className="job-action-buttons">
          <Button
            size="small"
            onClick={() => openDescriptionModal(record)}
            icon={<FileText size={14} />}
          >
            Description
          </Button>

          <Button
            type="primary"
            size="small"
            onClick={() => openEditPositionModal(record)}
            icon={<Pencil size={14} />}
          >
            Update
          </Button>

          <Popconfirm
            title="Delete job position?"
            description="Are you sure you want to delete this job position?"
            okText="Yes"
            cancelText="No"
            onConfirm={() => handleDeletePosition(record.jobPositionId)}
          >
            <Button danger size="small" icon={<Trash2 size={14} />}>
              Delete
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  const descriptionColumns = [
    {
      title: "ID",
      key: "jobDescriptionId",
      width: 80,
      render: (_, record) =>
        record?.jobDescriptionId ?? record?.jobDescriptionID ?? record?.jobDescriptionid ?? record?.id ?? record?.Id,
    },
    {
      title: "Job Title",
      key: "jobTitle",
      render: (_, record) => {
        const jobPositionId = record?.jobPositionId ?? record?.jobPositionID ?? record?.jobPositionid;
        return jobTitleByPositionId[jobPositionId] || "-";
      },
    },
    {
      title: "Job Position ID",
      key: "jobPositionId",
      width: 140,
      render: (_, record) => record?.jobPositionId ?? record?.jobPositionID ?? record?.jobPositionid,
    },
    { title: "Hire Qty", dataIndex: "hireQuantity", key: "hireQuantity", width: 110 },
    { title: "Applied Qty", dataIndex: "appliedQuantity", key: "appliedQuantity", width: 120 },
    {
      title: "Description",
      key: "jobDescription",
      render: (_, record) => {
        const text = record?.jobDescription ?? record?.description ?? record?.jobDesc ?? "";
        if (!text) return <span style={{ color: "#999" }}>—</span>;
        return <span title={text}>{text.length > 80 ? `${text.slice(0, 80)}…` : text}</span>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 220,
      render: (_, record) => (
        <div className="job-action-buttons">
          <Button
            type="primary"
            size="small"
            onClick={() => openEditDescriptionModal(record)}
            icon={<Pencil size={14} />}
          >
            Update
          </Button>
          <Popconfirm
            title="Delete job description?"
            description="Are you sure you want to delete this job description?"
            okText="Yes"
            cancelText="No"
            onConfirm={() => handleDeleteDescription(record)}
          >
            <Button danger size="small" icon={<Trash2 size={14} />}>
              Delete
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <Card className="job-management-wrapper">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "positions",
              label: "Job Positions",
              children: (
                <>
                  <div className="job-management-header">
                    <Input
                      placeholder="Search job position..."
                      prefix={<Search size={16} />}
                      className="job-search-input"
                      onChange={(e) => handleSearchPositions(e.target.value)}
                    />

                    <div className="job-header-buttons">
                      <Button
                        className="job-create-btn"
                        type="primary"
                        icon={<Plus size={16} />}
                        onClick={openCreatePositionModal}
                      >
                        Create
                      </Button>

                      <Button
                        className="job-refresh-btn"
                        icon={<RefreshCcw size={16} />}
                        onClick={refreshAll}
                      >
                        Refresh
                      </Button>
                    </div>
                  </div>

                  <Table
                    columns={positionColumns}
                    dataSource={filteredPositions}
                    rowKey="jobPositionId"
                    loading={positionsLoading}
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: true }}
                  />
                </>
              ),
            },
            {
              key: "titles",
              label: "Job Titles",
              children: (
                <>
                  <div className="job-management-header">
                    <Input
                      placeholder="Search job title..."
                      prefix={<Search size={16} />}
                      className="job-search-input"
                      onChange={(e) => handleSearch(e.target.value)}
                    />

                    <div className="job-header-buttons">
                      <Button
                        className="job-create-btn"
                        type="primary"
                        icon={<Plus size={16} />}
                        onClick={openCreateModal}
                      >
                        Create
                      </Button>

                      <Button
                        className="job-refresh-btn"
                        icon={<RefreshCcw size={16} />}
                        onClick={refreshAll}
                      >
                        Refresh
                      </Button>
                    </div>
                  </div>

                  <Table
                    columns={columns}
                    dataSource={filtered}
                    rowKey="jobTitleId"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                  />
                </>
              ),
            },
            {
              key: "descriptions",
              label: "Job Descriptions",
              children: (
                <>
                  <div className="job-management-header">
                    <Input
                      placeholder="Search job description..."
                      prefix={<Search size={16} />}
                      className="job-search-input"
                      onChange={(e) => handleSearchDescriptions(e.target.value)}
                    />

                    <div className="job-header-buttons">
                      <Button
                        className="job-create-btn"
                        type="primary"
                        icon={<Plus size={16} />}
                        onClick={openCreateDescriptionModal}
                      >
                        Create
                      </Button>

                      <Button
                        className="job-refresh-btn"
                        icon={<RefreshCcw size={16} />}
                        onClick={refreshAll}
                      >
                        Refresh
                      </Button>
                    </div>
                  </div>

                  <Table
                    columns={descriptionColumns}
                    dataSource={filteredDescriptions}
                    rowKey={(r) =>
                      r?.jobDescriptionId ?? r?.jobDescriptionID ?? r?.jobDescriptionid ?? r?.id ?? r?.Id
                    }
                    loading={descriptionsLoading}
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: true }}
                  />
                </>
              ),
            },
          ]}
        />
      </Card>

      {/* CREATE / EDIT MODAL */}
      <Modal
        title={editData ? "Update Job Title" : "Create Job Title"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSubmit}
        okText={editData ? "Update" : "Create"}
      >
        <Form layout="vertical" form={form}>
          <Form.Item
            label="Job Title"
            name="jobTitle"
            rules={[{ required: true, message: "Please enter job title" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item label="Position Amount" name="positionAmount">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* CREATE / EDIT JOB POSITION MODAL */}
      <Modal
        title={editPosition ? "Update Job Position" : "Create Job Position"}
        open={isPositionModalOpen}
        onCancel={() => setIsPositionModalOpen(false)}
        onOk={handleSubmitPosition}
        okText={editPosition ? "Update" : "Create"}
      >
        <Form layout="vertical" form={positionForm}>
          <Form.Item
            label="Major"
            name="majorId"
            rules={[{ required: true, message: "Please select major" }]}
          >
            <Select
              placeholder="Select major"
              options={majors.map((m) => ({
                label: m.majorTitle,
                value: m.majorId,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="Semester"
            name="semesterId"
            rules={[{ required: true, message: "Please select semester" }]}
          >
            <Select
              placeholder="Select semester"
              options={semesters.map((s) => ({
                label: s.name,
                value: s.semesterId,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="Job Title"
            name="jobTitleId"
            rules={[{ required: true, message: "Please select a job title" }]}
          >
            <Select
              placeholder="Select job title"
              showSearch
              optionFilterProp="label"
              options={jobs.map((j) => ({
                label: `${j.jobTitle} (ID: ${j.jobTitleId})`,
                value: j.jobTitleId,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="Requirements"
            name="requirements"
            rules={[{ required: true, message: "Please enter requirements" }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item
            label="Benefit"
            name="benefit"
            rules={[{ required: true, message: "Please enter benefit" }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item
            label="Location"
            name="location"
            rules={[{ required: true, message: "Please enter location" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Salary Range"
            name="salaryRange"
            rules={[{ required: true, message: "Please enter salary range" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item label="Active" name="isActive" valuePropName="checked">
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>
        </Form>
      </Modal>

      {/* JOB DESCRIPTION MODAL */}
      <Modal
        title={descEditJob ? `Job Description: ${descEditJob.jobTitle}` : "Job Description"}
        open={isDescModalOpen}
        onCancel={() => setIsDescModalOpen(false)}
        onOk={handleSubmitDescription}
        okText="Save"
        confirmLoading={descLoading}
      >
        <Form layout="vertical" form={descForm}>
          <Form.Item
            label="Job Position"
            name="jobPositionId"
            rules={[{ required: true, message: "Please select job position" }]}
          >
            <Select
              placeholder="Select job position"
              onChange={(jobPositionId) => {
                const existing = descriptionsByJobPositionId[jobPositionId];
                setDescExistingRecord(existing || null);
                descForm.setFieldsValue({
                  jobDescription: existing?._text || "",
                  hireQuantity: existing?.hireQuantity ?? 0,
                  appliedQuantity: existing?.appliedQuantity ?? 0,
                });
              }}
              options={jobPositions.map((jp) => ({
                label: `${jp.jobTitle} (ID: ${jp.jobPositionId})`,
                value: jp.jobPositionId,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="Job Description"
            name="jobDescription"
            rules={[{ required: true, message: "Please enter job description" }]}
          >
            <Input.TextArea rows={6} placeholder="Enter job description..." />
          </Form.Item>

          <Form.Item
            label="Hire Quantity"
            name="hireQuantity"
            rules={[{ required: true, message: "Please enter hire quantity" }]}
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            label="Applied Quantity"
            name="appliedQuantity"
            rules={[{ required: true, message: "Please enter applied quantity" }]}
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default JobManagement;
