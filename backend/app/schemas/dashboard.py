from pydantic import BaseModel
from typing import List, Optional
from datetime import date

class StatSummary(BaseModel):
    total_users: int
    present_today: int
    absent_today: int
    late_today: int
    attendance_rate: float

class DailyTrend(BaseModel):
    date: str
    present: int
    late: int
    absent: int

class DepartmentBreakdown(BaseModel):
    department: str
    total_users: int
    present: int
    percentage: float

class HourlyDistribution(BaseModel):
    hour: str
    count: int

class RecentAttendanceItem(BaseModel):
    id: int
    user_id: int
    name: str
    unique_id: str
    department: str
    time: str
    status: str
    confidence: Optional[float]
    liveness_passed: bool

class DashboardStatsResponse(BaseModel):
    summary: StatSummary
    daily_trends: List[DailyTrend]
    department_breakdowns: List[DepartmentBreakdown]
    hourly_distributions: List[HourlyDistribution]
    recent_attendances: List[RecentAttendanceItem]
