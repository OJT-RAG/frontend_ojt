import React, { useEffect, useState } from "react";
import { Card, Spin } from "antd";
import companyApi from "../../API/CompanyAPI";
import companySemesterApi from "../../API/CompanySemesterAPI";
import semesterApi from "../../API/SemesterAPI";

export default function CompanySemesterPie() {
  const [loading, setLoading] = useState(true);
  const [registered, setRegistered] = useState(0);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [data, setData] = useState([]);
  const [PieChart, setPieChart] = useState(null);

  // ✅ LOAD PIE CHỈ Ở CLIENT
  useEffect(() => {
    import("@ant-design/plots").then((mod) => {
      setPieChart(() => mod.Pie);
    });
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const semesterRes = await semesterApi.getAll();
      const currentSemester = semesterRes?.data?.data?.find(
        (s) => s.isActive === true
      );

      if (!currentSemester) {
        setData([]);
        return;
      }

      const companyRes = await companyApi.getAll();
      const total = companyRes?.data?.data?.length || 0;
      setTotalCompanies(total);

      const semesterCompanyRes =
        await companySemesterApi.getBySemester(currentSemester.semesterId);

      const semesterCompanies = semesterCompanyRes?.data?.data || [];

      const registeredCount = new Set(
        semesterCompanies.map((i) => i.companyId)
      ).size;

      setRegistered(registeredCount);

      setData([
        { type: "Registered", value: registeredCount },
        { type: "Not registered", value: Math.max(total - registeredCount, 0) },
      ]);
    } catch (e) {
      console.error(e);
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
    legend: { position: "bottom" },
    label: false,
  };

  return (
    <Card title="Companies participating in current semester">
      {loading || !PieChart ? (
        <Spin />
      ) : (
        <div style={{ position: "relative" }}>
          <PieChart {...config} />

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
