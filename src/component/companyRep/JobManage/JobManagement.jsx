import React, { useEffect, useState } from "react";
import { Table, Input, Button, Card, Modal, Form, InputNumber, Popconfirm } from "antd";
import { RefreshCcw, Search, Plus, Pencil, Trash2 } from "lucide-react";
import jobApi from "../../API/JobAPI";
import "./JobManagement.css";

const JobManagement = () => {
  const [jobs, setJobs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form] = Form.useForm();

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await jobApi.getAll();
      const list = res.data?.data || [];
      setJobs(list);
      setFiltered(list);
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleSearch = (value) => {
    const result = jobs.filter((job) =>
      job.jobTitle.toLowerCase().includes(value.toLowerCase())
    );
    setFiltered(result);
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
    { title: "Positions", dataIndex: "positionAmount", key: "amount", width: 150 },

    {
      title: "Actions",
      key: "actions",
      width: 160,
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

  return (
    <>
      <Card className="job-management-wrapper">
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
              onClick={fetchJobs}
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
    </>
  );
};

export default JobManagement;
