import React, { useEffect, useState } from "react";
import { Card, Spin } from "antd";
import { Pie } from "@ant-design/plots";
import companyApi from "../../API/CompanyAPI";
import companySemesterApi from "../../API/CompanySemesterAPI";
import semesterApi from "../../API/SemesterAPI";

export default function CompanySemesterPie() {
  const [loading, setLoading] = useState(true);
  const [registered, setRegistered] = useState(0);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // 1️⃣ Lấy semester hiện tại
      const semesterRes = await semesterApi.getAll();
      const currentSemester = semesterRes?.data?.data?.find(
        (s) => s.isActive === true
      );

      if (!currentSemester) {
        setData([]);
        return;
      }

      // 2️⃣ Tổng số company
      const companyRes = await companyApi.getAll();
      const total = companyRes?.data?.data?.length || 0;
      setTotalCompanies(total);

      // 3️⃣ Company đã đăng ký semester
      const semesterCompanyRes =
        await companySemesterApi.getBySemester(currentSemester.semesterId);

      const semesterCompanies = semesterCompanyRes?.data?.data || [];

      const registeredCount = new Set(
        semesterCompanies.map((i) => i.companyId)
      ).size;

      setRegistered(registeredCount);

      // 4️⃣ Data cho donut
      setData([
        { type: "Registered", value: registeredCount },
        { type: "Not registered", value: Math.max(total - registeredCount, 0) },
      ]);
    } catch (error) {
      console.error("❌ CompanySemesterPie error:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const config = {
    data,
    angleField: "value",
    colorField: "type",
    radius: 1,
    innerRadius: 0.7,
    height: 300,
    legend: {
      position: "bottom",
    },

    // ❌ TẮT label để tránh BUG plots
    label: false,

    tooltip: {
      formatter: (datum) => ({
        name: datum?.type || "",
        value: datum?.value ?? 0,
      }),
    },
  };

  return (
    <Card title="Companies participating in current semester">
      {loading ? (
        <Spin />
      ) : (
        <div style={{ position: "relative" }}>
          <Pie {...config} />

          {/* ✅ SỐ Ở GIỮA – CÁCH AN TOÀN NHẤT */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            <div style={{ fontSize: 14, color: "#888" }}>
              Registered
            </div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>
              {registered} / {totalCompanies}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
