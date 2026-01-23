import React, { useState, useEffect } from "react";
import { Button, notification, Spin, Table, Tag } from "antd";
import finalReportApi from "../../API/FinalReportAPI";

import "./FinalReport.css";

const safeParseJson = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const resolveUserId = () => {
  const authUser = safeParseJson(localStorage.getItem("authUser") || "{}", {});
  const userInfo = safeParseJson(localStorage.getItem("userInfo") || "{}", {});
  return (
    Number(authUser?.id ?? authUser?.userId ?? userInfo?.userId ?? 0) || 0
  );
};
const FinalReportPage = () => {
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  
  const getResultImage = () => {
  if (!selectedReport || selectedReport.companyRating == null) return null;

  return Number(selectedReport.companyRating) >= 3
    ? "/pngtree-check-green-tick-sign-symbol-png-image_7586711.png"
    : "/png-clipart-symbole-de-coche-marque-x-cordons-elastiques-logo-rouge-aile-ligne-bec-thumbnail.png";
};

  useEffect(() => {
    let cancelled = false;

    const fetchReports = async () => {
      const userId = resolveUserId();
      if (!userId) {
        notification.warning({
          message: "Vui lòng đăng nhập",
          description: "Không tìm thấy userId.",
        });
        setReports([]);
        setSelectedReport(null);
        return;
      }

      setLoading(true);
      try {
        const res = await finalReportApi.getByUserId(userId);
        const list = res?.data?.data || [];
        if (cancelled) return;
        setReports(Array.isArray(list) ? list : []);
        setSelectedReport((prev) => {
          if (prev) return prev;
          return Array.isArray(list) && list.length > 0 ? list[0] : null;
        });
      } catch (err) {
        if (cancelled) return;
        notification.error({
          message: "Lỗi tải báo cáo",
          description: err?.response?.data?.message || err?.message || "Không thể tải báo cáo",
        });
        setReports([]);
        setSelectedReport(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchReports();
    return () => {
      cancelled = true;
    };
  }, []);

  const statusTag = (score) => {
    if (score == null) return <Tag color="gold">Chưa chấm</Tag>;
    return <Tag color={Number(score) >= 5 ? "green" : "red"}>{score}</Tag>;
  };

  const columns = [
  {
    title: "Job Position",
    dataIndex: "jobPositionId",
    key: "jobPositionId",
    width: 120,
  },
  {
    title: "Semester",
    dataIndex: "semesterId",
    key: "semesterId",
    width: 100,
  },

  // ⬅️ ĐẨY FILE SANG TRÁI + THU NHỎ
  {
    title: "File",
    dataIndex: "studentReportFile",
    key: "studentReportFile",
    width: 90,
    align: "center",
    render: (file) =>
      file ? (
        <a href={file} target="_blank" rel="noreferrer">
          PDF
        </a>
      ) : (
        <span style={{ color: "#999" }}>-</span>
      ),
  },

  // ⬅️ FINAL GỌN LẠI
  {
    title: "Final",
    dataIndex: "companyRating",
    key: "companyRating",
    width: 80,
    align: "center",
    render: (score) => statusTag(score),
  },

  // ⭐ NHẬN XÉT ĂN KHÔNG GIAN
  {
    title: "Nhận xét",
    dataIndex: "companyFeedback",
    key: "companyFeedback",
    ellipsis: true,
    render: (text) =>
      text ? text : <span style={{ color: "#999" }}>-</span>,
  },

  {
    title: "Người chấm",
    dataIndex: "companyEvaluator",
    key: "companyEvaluator",
    width: 160,
    render: (text) =>
      text ? text : <span style={{ color: "#999" }}>-</span>,
  },

  {
    title: "Ngày nộp",
    dataIndex: "submittedAt",
    key: "submittedAt",
    width: 160,
    render: (d) => (d ? new Date(d).toLocaleString() : "-"),
  },
];



  return (
    <div className="final-report-wrapper">
      <h2 className="final-report-header">Báo Cáo Cuối Kỳ</h2>

      <div className="content-container">
        <div className="left-panel">
          <Spin spinning={loading}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
              <div style={{ fontWeight: 700 }}>Danh sách báo cáo</div>
              <Button onClick={() => {
                const userId = resolveUserId();
                if (!userId) return;
                setLoading(true);
                finalReportApi.getByUserId(userId)
                  .then((res) => {
                    const list = res?.data?.data || [];
                    setReports(Array.isArray(list) ? list : []);
                    setSelectedReport(Array.isArray(list) && list.length > 0 ? list[0] : null);
                  })
                  .catch((err) => {
                    notification.error({
                      message: "Lỗi tải báo cáo",
                      description: err?.response?.data?.message || err?.message || "Không thể tải báo cáo",
                    });
                  })
                  .finally(() => setLoading(false));
              }}>
                Refresh
              </Button>
            </div>

            <Table
  rowKey={(r) =>
    r?.finalreportId ??
    r?.finalReportId ??
    r?.id ??
    `${r?.userId}-${r?.jobPositionId}-${r?.semesterId}`
  }
  columns={columns}
  dataSource={reports}
  pagination={false}   // 🔥 BỎ PAGINATION
  onRow={(record) => ({
    onClick: () => setSelectedReport(record),
  })}
  rowClassName={(record) => {
    const selectedKey =
      selectedReport?.finalreportId ??
      selectedReport?.finalReportId ??
      selectedReport?.id;
    const recordKey =
      record?.finalreportId ??
      record?.finalReportId ??
      record?.id;
    return selectedKey != null && recordKey === selectedKey
      ? "is-selected"
      : "";
  }}
/>
          </Spin>
        </div>
      </div>
      {/* 🎯 HÌNH KẾT QUẢ */}
{selectedReport && selectedReport.companyRating != null && (
  <div style={{ marginTop: 24, textAlign: "center" }}>
    <img
      src={getResultImage()}
      alt="Kết quả đánh giá"
      style={{
        maxWidth: 260,
        width: "100%",
        
      }}
    />
    <div style={{ marginTop: 8, fontWeight: 600 }}>
      {Number(selectedReport.companyRating) >= 3
        ? "Đạt yêu cầu"
        : "Không đạt yêu cầu"}
    </div>
  </div>
)}
    </div>
    

  );
};

export default FinalReportPage;
