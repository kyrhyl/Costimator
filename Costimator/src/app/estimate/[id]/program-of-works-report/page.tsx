"use client";

import { useParams } from 'next/navigation';
import ProgramOfWorksReport from '@/components/program-of-works/ProgramOfWorksReport';

export default function ProgramOfWorksReportPage() {
  const params = useParams();
  const estimateId = params?.id as string;

  return <ProgramOfWorksReport estimateId={estimateId} />;
}
