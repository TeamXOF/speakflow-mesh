'use client';

import Link from 'next/link';
import { Search, Plus, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { fetchStudentsList } from '@/lib/api';

export default function StudentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    fetchStudentsList().then(data => {
      setStudents(data);
    }).catch(console.error);
  }, []);

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
          <input 
            type="text" 
            placeholder="Search students..." 
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button 
          className="w-full sm:w-auto bg-[var(--accent-primary)] text-black px-6 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          onClick={() => alert("Add Student modal coming soon!")}
        >
          <Plus size={18} />
          Add Student
        </button>
      </div>

      {/* Students List */}
      <div className="speakflow-card overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-5 gap-4 p-4 border-b border-[var(--border-color)] bg-gray-50 font-medium text-[var(--text-secondary)] text-sm">
          <div className="col-span-2 sm:col-span-1">Name</div>
          <div className="hidden sm:block">Level / Age</div>
          <div className="hidden sm:block">Last Active</div>
          <div>Status</div>
          <div className="text-right">Action</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-[var(--border-color)]">
          {filteredStudents.length > 0 ? (
            filteredStudents.map(student => (
              <Link 
                href={`/students/${student.id}`} 
                key={student.id}
                className="grid grid-cols-5 gap-4 p-4 items-center hover:bg-gray-50 transition-colors cursor-pointer group"
              >
                <div className="col-span-2 sm:col-span-1 font-bold text-[var(--text-primary)]">
                  {student.name}
                </div>
                <div className="hidden sm:block text-[var(--text-secondary)]">
                  Level {student.level} • {student.age} Years
                </div>
                <div className="hidden sm:block font-mono text-sm text-[var(--text-secondary)]">
                  {new Date(student.last_active).toLocaleDateString()}
                </div>
                <div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    student.status === 'Active' 
                      ? 'bg-[var(--success)]/10 text-[var(--success)]' 
                      : 'bg-gray-100 text-[var(--text-secondary)]'
                  }`}>
                    {student.status}
                  </span>
                </div>
                <div className="flex justify-end text-[var(--text-secondary)] group-hover:text-[var(--accent-primary)] transition-colors">
                  <ChevronRight size={20} />
                </div>
              </Link>
            ))
          ) : (
            <div className="p-8 text-center text-[var(--text-secondary)]">
              No students found matching "{searchQuery}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
