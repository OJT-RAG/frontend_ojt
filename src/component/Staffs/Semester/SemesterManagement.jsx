import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Tag,
  Popconfirm,
  message,
  Card,
  Modal,
  Form,
  Input,
  DatePicker,
  Switch,
} from "antd";
import semesterApi from "../../API/SemesterAPI.js";
import dayjs from "dayjs";

const SemesterManagement = () => {
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [editing, setEditing] = useState(null);

  const [form] = Form.useForm();
  const [createForm] = Form.useForm();

  // LOAD LIST
  const loadSemesters = async () => {
    setLoading(true);
    try {
      const res = await semesterApi.getAll();

      const list =
        res?.data?.data ??
        res?.data?.items ??
        (Array.isArray(res?.data) ? res.data : []);

      setSemesters(list);
    } catch (err) {
      console.error(err);
      message.error("Failed to load semesters!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSemesters();
  }, []);

  // DELETE
  const handleDelete = async (id) => {
    try {
      await semesterApi.delete(id);
      message.success("Deleted successfully!");
      loadSemesters();
    } catch (err) {
      console.error(err);
      message.error("Delete failed!");
    }
  };

  // OPEN EDIT
  const openEditModal = (record) => {
    setEditing(record);

    form.setFieldsValue({
      name: record.name,
      startDate: dayjs(record.startDate),
      endDate: dayjs(record.endDate),
      isActive: record.isActive,
    });

    setEditModalOpen(true);
  };

  // SUBMIT EDIT
  const submitEdit = async () => {
    try {
      const values = await form.validateFields();

      const payload = {
        name: values.name,
        startDate: values.startDate.format("YYYY-MM-DD"),
        endDate: values.endDate.format("YYYY-MM-DD"),
        isActive: values.isActive,
      };

      await semesterApi.update(editing.semesterId, payload);

      message.success("Updated successfully!");
      setEditModalOpen(false);
      loadSemesters();
    } catch (err) {
      console.error(err);
      message.error("Update failed!");
    }
  };

  // CREATE SEMESTER
  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();

      const payload = {
        name: values.name,
        startDate: values.startDate.format("YYYY-MM-DD"),
        endDate: values.endDate.format("YYYY-MM-DD"),
        isActive: values.isActive,
      };

      // 1️⃣ Create semester
      const res = await semesterApi.create(payload);

      const createdId =
        res?.data?.data?.semesterId || res?.data?.semesterId;

      // 2️⃣ Set inactive all others
      const updates = semesters
        .filter((s) => s.semesterId !== createdId)
        .map((s) =>
          semesterApi.update(s.semesterId, {
            name: s.name,
            startDate: s.startDate,
            endDate: s.endDate,
            isActive: false,
          })
        );

      await Promise.all(updates);

      message.success("Created successfully!");
      setCreateModalOpen(false);
      createForm.resetFields();
      loadSemesters();
    } catch (err) {
      console.error(err);
      message.error("Create failed!");
    }
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "semesterId",
      width: 80,
    },
    {
      title: "Name",
      dataIndex: "name",
    },
    {
      title: "Start Date",
      dataIndex: "startDate",
      render: (v) => new Date(v).toLocaleDateString(),
    },
    {
      title: "End Date",
      dataIndex: "endDate",
      render: (v) => new Date(v).toLocaleDateString(),
    },
    {
      title: "Status",
      dataIndex: "isActive",
      render: (v) =>
        v ? <Tag color="green">Active</Tag> : <Tag color="red">Inactive</Tag>,
    },
    {
      title: "Actions",
      render: (_, r) => (
        <>
          <Button
            type="primary"
            style={{ marginRight: 10 }}
            onClick={() => openEditModal(r)}
          >
            Edit
          </Button>

          <Popconfirm
            title="Confirm delete?"
            okText="Yes"
            cancelText="No"
            onConfirm={() => handleDelete(r.semesterId)}
          >
            <Button danger>Delete</Button>
          </Popconfirm>
        </>
      ),
    },
  ];

  return (
    <>
      <Card
        title="Semester Management"
        bordered={false}
        extra={
          <Button type="primary" onClick={() => setCreateModalOpen(true)}>
            Create Semester
          </Button>
        }
      >
        <Table
          rowKey="semesterId"
          loading={loading}
          columns={columns}
          dataSource={semesters}
          pagination={{ pageSize: 5 }}
        />
      </Card>

      {/* CREATE MODAL */}
      <Modal
        title="Create Semester"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={handleCreate}
        okText="Create"
      >
        <Form form={createForm} layout="vertical">
          <Form.Item
            name="name"
            label="Semester Name"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="startDate"
            label="Start Date"
            rules={[{ required: true }]}
          >
            <DatePicker format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item
            name="endDate"
            label="End Date"
            rules={[{ required: true }]}
          >
            <DatePicker format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Switch defaultChecked />
          </Form.Item>
        </Form>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        title="Edit Semester"
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={submitEdit}
        okText="Save"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Semester Name"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="startDate"
            label="Start Date"
            rules={[{ required: true }]}
          >
            <DatePicker format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item
            name="endDate"
            label="End Date"
            rules={[{ required: true }]}
          >
            <DatePicker format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default SemesterManagement;