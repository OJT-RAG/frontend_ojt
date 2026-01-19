import React, { useState, useEffect } from "react";
import { Button, notification, Spin, Table, Tag } from "antd";
import finalReportApi from "../../API/FinalReportAPI";

import { Worker, Viewer } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

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

  const layoutPlugin = defaultLayoutPlugin();
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
    { title: "Job Position ID", dataIndex: "jobPositionId", key: "jobPositionId", width: 130 },
    { title: "Semester ID", dataIndex: "semesterId", key: "semesterId", width: 110 },
    {
      title: "File",
      dataIndex: "studentReportFile",
      key: "studentReportFile",
      render: (file) =>
        file ? (
          <a href={file} target="_blank" rel="noreferrer">Xem PDF</a>
        ) : (
          <span style={{ color: "#999" }}>Không có</span>
        ),
    },
    {
      title: "Final",
      dataIndex: "companyRating",
      key: "companyRating",
      width: 90,
      render: (score) => statusTag(score),
    },
    {
      title: "Ngày nộp",
      dataIndex: "submittedAt",
      key: "submittedAt",
      width: 170,
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
              rowKey={(r) => r?.finalreportId ?? r?.finalReportId ?? r?.id ?? `${r?.userId}-${r?.jobPositionId}-${r?.semesterId}`}
              columns={columns}
              dataSource={reports}
              pagination={{ pageSize: 6 }}
              onRow={(record) => ({
                onClick: () => setSelectedReport(record),
              })}
              rowClassName={(record) => {
                const selectedKey = selectedReport?.finalreportId ?? selectedReport?.finalReportId ?? selectedReport?.id;
                const recordKey = record?.finalreportId ?? record?.finalReportId ?? record?.id;
                return selectedKey != null && recordKey === selectedKey ? "is-selected" : "";
              }}
            />

            {selectedReport && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Chi tiết</div>
                <div><strong>Nhận xét:</strong> {selectedReport.companyFeedback || "-"}</div>
                <div><strong>Người chấm:</strong> {selectedReport.companyEvaluator || "-"}</div>
              </div>
            )}
          </Spin>
        </div>

        <div className="right-panel">
          {selectedReport?.studentReportFile ? (
            <div className="pdf-viewer">
              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                <Viewer
                  key={selectedReport.studentReportFile}
                  fileUrl={selectedReport.studentReportFile}
                  plugins={[layoutPlugin]}
                />
              </Worker>
            </div>
          ) : (
            <div className="empty-viewer">Chưa có báo cáo PDF</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinalReportPage;
