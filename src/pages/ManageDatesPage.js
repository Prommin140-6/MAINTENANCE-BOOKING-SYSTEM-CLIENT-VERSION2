import React, { useState, useEffect } from 'react';
import { Calendar, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import moment from 'moment';
import 'moment/locale/th';

// ตั้งค่า locale เป็นภาษาไทย
moment.locale('th');

// กำหนด URL ของ Backend (เปลี่ยนเป็น URL ที่ deploy แล้ว)
const API_BASE_URL = 'https://maintenance-booking-system-server.onrender.com'; // แทนที่ด้วย URL จริง

const ManageDatesPage = () => {
  const navigate = useNavigate();
  const [bookedDates, setBookedDates] = useState([]);
  const [closedDates, setClosedDates] = useState([]);
  const [userSelected, setUserSelected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/admin/login');
    }

    // ดึงวันที่ที่ถูกจองแล้ว
    axios.get(`${API_BASE_URL}/api/maintenance/booked-dates`)
      .then(response => {
        const dates = Array.isArray(response.data) ? response.data : Array.isArray(response.data.bookedDates) ? response.data.bookedDates : [];
        setBookedDates(dates);
      })
      .catch(error => {
        console.error('Error fetching booked dates:', error);
        setBookedDates([]);
      });

    // ดึงวันที่ที่ถูกปิด
    axios.get(`${API_BASE_URL}/api/closed-dates`)
      .then(response => {
        const dates = Array.isArray(response.data) ? response.data : Array.isArray(response.data.closedDates) ? response.data.closedDates : [];
        setClosedDates(dates.map(cd => ({ ...cd, date: new Date(cd.date) })));
      })
      .catch(error => {
        console.error('Error fetching closed dates:', error);
        setClosedDates([]);
      });
  }, [navigate]);

  const dateCellRender = (value) => {
    const dateString = value.format('YYYY-MM-DD');
    const isBooked = Array.isArray(bookedDates) && bookedDates.includes(dateString);
    const isClosed = Array.isArray(closedDates) && closedDates.some(cd => new Date(cd.date).toISOString().split('T')[0] === dateString);

    if (isBooked || isClosed) {
      return <div style={{ backgroundColor: '#9CA3AF', height: '100%' }} />;
    }
    return null;
  };

  const onSelect = (value, { source }) => {
    if (source !== 'date') {
      setUserSelected(false);
      return;
    }

    setUserSelected(true);

    const dateString = value.format('YYYY-MM-DD');
    const isBooked = Array.isArray(bookedDates) && bookedDates.includes(dateString);
    const closedDate = Array.isArray(closedDates) && closedDates.find(cd => new Date(cd.date).toISOString().split('T')[0] === dateString);

    if (closedDate) {
      Swal.fire({
        title: 'ต้องการเปิดรับคิวเพิ่มสำหรับวันนี้ไหม?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#CD9969',
        cancelButtonColor: '#896253',
        confirmButtonText: 'เปิด',
        cancelButtonText: 'ยกเลิก',
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            await axios.delete(`${API_BASE_URL}/api/closed-dates/${closedDate._id}`);
            setClosedDates(closedDates.filter(cd => cd._id !== closedDate._id));
            setBookedDates(bookedDates.filter(date => date !== dateString));
            Swal.fire('เปิดรับคิวสำเร็จ!', `เปิดรับคิววันที่ ${value.format('D MMMM YYYY')} สำเร็จ`, 'success');
          } catch (error) {
            console.error('Error opening date:', error);
            Swal.fire('เกิดข้อผิดพลาด!', 'ไม่สามารถเปิดวันได้', 'error');
          }
        }
      });
    } else if (!isBooked) {
      Swal.fire({
        title: 'ต้องการปิดรับคิวเพิ่มสำหรับวันนี้ไหม?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#CD9969',
        cancelButtonColor: '#896253',
        confirmButtonText: 'ปิด',
        cancelButtonText: 'ยกเลิก',
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            const response = await axios.post(`${API_BASE_URL}/api/closed-dates`, {
              date: value.toISOString(),
            });
            setClosedDates([...closedDates, response.data]);
            setBookedDates([...bookedDates, dateString]);
            Swal.fire('ปิดรับคิวสำเร็จ!', `ปิดรับคิววันที่ ${value.format('D MMMM YYYY')} สำเร็จ`, 'success');
          } catch (error) {
            console.error('Error closing date:', error);
            Swal.fire('เกิดข้อผิดพลาด!', 'ไม่สามารถปิดวันได้', 'error');
          }
        }
      });
    }
  };

  const onPanelChange = () => {
    setUserSelected(false);
  };

  return (
    <div className="min-h-screen p-6 bg-white">
      <div className="flex justify-between items-center mb-6">
        <Button
          onClick={() => navigate('/admin')}
          className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold"
        >
          กลับไปหน้าแอดมิน
        </Button>
        <h1 className="text-2xl font-bold uppercase tracking-wide text-gray-800">
          จัดการวัน
        </h1>
        <div></div>
      </div>
      <div className="p-4 rounded-lg shadow-md">
        <Calendar
          dateCellRender={dateCellRender}
          onSelect={onSelect}
          onPanelChange={onPanelChange}
          disabledDate={(current) => current < moment().startOf('day')}
        />
      </div>
    </div>
  );
};

export default ManageDatesPage;