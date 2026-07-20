import React, { useState, useRef } from 'react';
import apiClient from '../api/apiClient';

export default function ReportIssue() {
  const [form, setForm] = useState({ category: '', description: '', location: '', ward: 'Ward 1', latitude: '', longitude: '', photoData: '' });
  const [photoPreview, setPhotoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [descLen, setDescLen] = useState(0);
  const fileRef = useRef(null);
  const categories = ['Streetlight','Drainage','Road Damage','Illegal Dumping','Unsafe Area','Encroachment'];
  const wards = ['Ward 1','Ward 2','Ward 3','Ward 4','Ward 5'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (name === 'description') setDescLen(value.length);
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setMessage('⚠️ Select an image file'); return; }
    if (file.size > 5*1024*1024) { setMessage('⚠️ Image must be < 5MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => { setPhotoPreview(reader.result); setForm(prev => ({ ...prev, photoData: reader.result })); };
    reader.readAsDataURL(file);
  };

  const getLocation = () => {
    setGeoLoading(true); setMessage('');
    if (!navigator.geolocation) { setMessage('❌ Geolocation not supported'); setGeoLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(prev => ({ ...prev, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }));
        setGeoLoading(false); setMessage('✅ Location captured!');
        setTimeout(() => setMessage(''), 3000);
      },
      () => { setGeoLoading(false); setMessage('❌ Failed to get location'); }
    );
  };

  const validate = () => {
    if (!form.category) { setMessage('⚠️ Select a category'); return false; }
    if (descLen < 10) { setMessage('⚠️ Description must be at least 10 characters'); return false; }
    if (descLen > 2000) { setMessage('⚠️ Description too long'); return false; }
    if (!form.location || form.location.trim().length < 3) { setMessage('⚠️ Enter a valid location'); return false; }
    if (!form.ward) { setMessage('⚠️ Select a ward'); return false; }
    const lat = parseFloat(form.latitude), lng = parseFloat(form.longitude);
    if (isNaN(lat) || lat < -90 || lat > 90) { setMessage('⚠️ Invalid latitude'); return false; }
    if (isNaN(lng) || lng < -180 || lng > 180) { setMessage('⚠️ Invalid longitude'); return false; }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setMessage('');
    if (!validate()) { setLoading(false); return; }
    try {
      const payload = { ...form, description: form.description.trim(), location: form.location.trim(), latitude: parseFloat(form.latitude), longitude: parseFloat(form.longitude), photoData: form.photoData || null };
      const res = await apiClient.post('/api/complaints', payload);
      setMessage(`✅ Complaint #${res.data.id} submitted!`);
      setForm({ category: '', description: '', location: '', ward: 'Ward 1', latitude: '', longitude: '', photoData: '' });
      setDescLen(0); setPhotoPreview(''); if (fileRef.current) fileRef.current.value = '';
      setTimeout(() => setMessage(''), 5000);
    } catch (err) { setMessage('❌ Failed to submit'); } finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Report a Civic Issue</h1>
      {message && <div className={`p-4 rounded-lg mb-6 ${message.includes('✅') ? 'bg-green-100 text-green-800' : message.includes('❌') ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>{message}</div>}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 space-y-5">
        <div><label className="block text-gray-700 font-bold mb-2">Category *</label><select name="category" value={form.category} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required><option value="">Select</option>{categories.map(c=> <option key={c} value={c}>{c}</option>)}</select></div>
        <div><label className="block text-gray-700 font-bold mb-2">Description * <span className={`ml-2 text-sm ${descLen<10 && descLen>0 ? 'text-red-500' : descLen>2000 ? 'text-red-500' : 'text-gray-500'}`}>({descLen}/2000)</span></label><textarea name="description" value={form.description} onChange={handleChange} rows="4" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Min 10 characters..." required/></div>
        <div><label className="block text-gray-700 font-bold mb-2">Location Address *</label><input name="location" value={form.location} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., Main Road, Sector 1" required/></div>
        <div><label className="block text-gray-700 font-bold mb-2">Ward *</label><select name="ward" value={form.ward} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">{wards.map(w => <option key={w} value={w}>{w}</option>)}</select></div>
        <div><label className="block text-gray-700 font-bold mb-2">Coordinates *</label><div className="grid grid-cols-2 gap-4"><input name="latitude" type="number" step="any" value={form.latitude} onChange={handleChange} className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Latitude" required/><input name="longitude" type="number" step="any" value={form.longitude} onChange={handleChange} className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Longitude" required/></div><button type="button" onClick={getLocation} disabled={geoLoading} className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-400">{geoLoading ? '📍 Getting...' : '📍 Use My Location'}</button></div>
        <div><label className="block text-gray-700 font-bold mb-2">Photo (Optional - Max 5MB)</label><input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>{photoPreview && <div className="mt-4"><img src={photoPreview} alt="Preview" className="max-h-48 rounded-lg"/></div>}</div>
        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400">{loading ? '⏳ Submitting...' : '📤 Submit Complaint'}</button>
      </form>
    </div>
  );
}