import React, { useState, useEffect } from "react";
import { Form, Input, Button, DatePicker, Upload, message, Select } from "antd";
import majorApi from "../../API/MajorAPI";
import companyApi from "../../API/CompanyAPI";

import { useNavigate } from "react-router-dom";
import moment from "moment";
import userApi from "../../API/UserAPI";
import "./UpdateUserProfile.css";

const UpdateUserPage = ({ userId = 0 }) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [avatarFileList, setAvatarFileList] = useState([]);
  const [cvFileList, setCvFileList] = useState([]);
  const [majors, setMajors] = useState([]);
  const [companyName, setCompanyName] = useState("");

  const resolvedUserId = React.useMemo(() => {
    if (userId && Number(userId) > 0) return Number(userId);
    try {
      const authUser = JSON.parse(localStorage.getItem("authUser") || "{}") || {};
      return Number(authUser.id) || 0;
    } catch {
      return 0;
    }
  }, [userId]);

  // Fetch dữ liệu user khi component mount
  useEffect(() => {
  const fetchUser = async () => {
    try {
      if (!resolvedUserId) {
        message.warning("Missing userId. Please login first.");
        return;
      }

      // 1️⃣ Fetch user
      const res = await userApi.getById(resolvedUserId);
      const data = res?.data?.data ?? res?.data ?? {};

      // 2️⃣ Set form values
      form.setFieldsValue({
        ...data,
        majorId: data?.majorId ?? "",
        companyId: data?.companyId ?? "",
        dob: data?.dob ? moment(data.dob) : null,
      });

      // 3️⃣ Fetch company name (nếu có companyId)
      if (data?.companyId) {
        try {
          const companyRes = await companyApi.getById(data.companyId);
          const companyData =
            companyRes?.data?.data ?? companyRes?.data ?? {};
          setCompanyName(companyData?.name || "");
        } catch (err) {
          console.error("Failed to fetch company", err);
          setCompanyName("");
        }
      } else {
        setCompanyName("");
      }
    } catch (error) {
      console.error(error);
      message.error("Failed to fetch user data");
    }
  };

  fetchUser();
}, [resolvedUserId, form]);

  useEffect(() => {
  const fetchMajors = async () => {
    try {
      const res = await majorApi.getAll();
      const list = res?.data?.data ?? res?.data ?? [];
      setMajors(list);
    } catch (err) {
      console.error(err);
      message.error("Failed to load majors");
    }
  };

  fetchMajors();
}, []);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const fd = new FormData();
      const userIdValue = values.userId ?? resolvedUserId;
      fd.append("UserId", String(userIdValue || ""));
      fd.append("StudentCode", values.studentCode ?? "");
      fd.append("Phone", values.phone ?? "");
      fd.append(
        "MajorId",
        values.majorId === 0 || values.majorId === "0" ? "" : (values.majorId ?? "")
      );
      fd.append("Dob", values.dob ? values.dob.format("YYYY-MM-DD") : "");
      fd.append(
        "CompanyId",
        values.companyId === 0 || values.companyId === "0" ? "" : (values.companyId ?? "")
      );
      fd.append("Fullname", values.fullname ?? "");
      fd.append("Password", values.password ?? "");

      const avatarFile = avatarFileList?.[0]?.originFileObj;
      if (avatarFile instanceof File) {
        fd.append("AvatarUrl", avatarFile, avatarFile.name);
      }
      const cvFile = cvFileList?.[0]?.originFileObj;
      if (cvFile instanceof File) {
        fd.append("CvUrl", cvFile, cvFile.name);
      }

      await userApi.update(fd);

      // Keep local authUser in sync so profile renders immediately.
      try {
        const raw = localStorage.getItem("authUser");
        const authUser = raw ? JSON.parse(raw) : null;
        if (authUser && typeof authUser === "object") {
          const nextAuthUser = {
            ...authUser,
            id: authUser?.id ?? userIdValue,
            fullname: values.fullname ?? authUser.fullname,
            studentCode: values.studentCode ?? authUser.studentCode,
            phone: values.phone ?? authUser.phone,
            dob: values.dob ? values.dob.format("YYYY-MM-DD") : (authUser.dob ?? ""),
            majorId:
              values.majorId === 0 || values.majorId === "0"
                ? ""
                : (values.majorId ?? authUser.majorId),
            companyId:
              values.companyId === 0 || values.companyId === "0"
                ? ""
                : (values.companyId ?? authUser.companyId),
          };
          localStorage.setItem("authUser", JSON.stringify(nextAuthUser));
        }
      } catch {
        // ignore localStorage parse/write failures
      }

      // Go back to the Student dashboard and open the Profile tab.
      navigate("/student", {
        replace: true,
        state: { activeModule: "profile", profileUpdated: true },
      });
    } catch (error) {
      console.error(error);
      message.error("Failed to update user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="update-user-container">
  <h2>Update User</h2>
  <Form
    form={form}
    layout="vertical"
    onFinish={onFinish}
    initialValues={{ userId: resolvedUserId }}
  >
        <Form.Item name="userId" hidden>
          <Input />
        </Form.Item>

        <Form.Item
  name="majorId"
  label="Major"
  rules={[{ required: true, message: "Please select a major" }]}
>
  <Select
    placeholder="Select major"
    optionFilterProp="label"
    showSearch
    options={majors.map((m) => ({
      label: m.majorTitle, // 👈 HIỂN THỊ
      value: m.majorId,    // 👈 GỬI LÊN BACKEND
    }))}
  />
</Form.Item>


        <Form.Item label="Company">
  <Input value={companyName} disabled />
</Form.Item>

        <Form.Item
          name="fullname"
          label="Full Name"
          rules={[{ required: true, message: "Please enter full name" }]}
        >
          <Input />
        </Form.Item>

        <Form.Item name="studentCode" label="Student Code">
          <Input />
        </Form.Item>

        <Form.Item name="dob" label="Date of Birth">
          <DatePicker format="YYYY-MM-DD" />
        </Form.Item>

        <Form.Item name="phone" label="Phone">
          <Input />
        </Form.Item>

        <Form.Item label="Avatar (optional)">
          <Upload
            accept="image/png,image/jpeg,.png,.jpg,.jpeg"
            maxCount={1}
            beforeUpload={(file) => {
              const allowed = file?.type === 'image/png' || file?.type === 'image/jpeg';
              if (!allowed) {
                message.error('Avatar must be a PNG or JPG image.');
                return Upload.LIST_IGNORE;
              }
              return false;
            }}
            fileList={avatarFileList}
            onChange={({ fileList }) => setAvatarFileList(fileList)}
            listType="picture"
          >
            <Button>Select avatar file</Button>
          </Upload>
        </Form.Item>

        <Form.Item label="CV (optional)">
          <Upload
            accept="application/pdf,.pdf"
            maxCount={1}
            beforeUpload={() => false}
            fileList={cvFileList}
            onChange={({ fileList }) => setCvFileList(fileList)}
          >
            <Button>Select CV file</Button>
          </Upload>
        </Form.Item>

        <Form.Item name="password" label="Password">
          <Input.Password />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            Update User
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default UpdateUserPage;
