import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  FileText,
  Upload,
  Sparkles,
  Check,
  AlertCircle,
  ArrowRight,
  Pencil,
} from 'lucide-react';
import { useAnalyzeEmail, useAnalyzePdf } from '../hooks/useReceiptAnalysis';
import { useCreateExpense } from '../hooks/useExpenses';
import { useCategories } from '../hooks/useCategories';
import type { ReceiptAnalysisResult, CreateExpenseData } from '../types';

type InputMode = 'email' | 'pdf';
type WizardStep = 'input' | 'preview' | 'success';

export function ReceiptUpload() {
  const navigate = useNavigate();

  const [inputMode, setInputMode] = useState<InputMode>('email');
  const [currentStep, setCurrentStep] = useState<WizardStep>('input');
  const [emailContent, setEmailContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ReceiptAnalysisResult | null>(null);
  const [editedResult, setEditedResult] = useState<ReceiptAnalysisResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeEmailMutation = useAnalyzeEmail();
  const analyzePdfMutation = useAnalyzePdf();
  const createExpenseMutation = useCreateExpense();
  const { data: categories } = useCategories();

  const isAnalyzing = analyzeEmailMutation.isPending || analyzePdfMutation.isPending;

  const handleAnalyze = async () => {
    setError(null);

    try {
      let result: ReceiptAnalysisResult;

      if (inputMode === 'email') {
        if (!emailContent.trim()) {
          setError('Please enter email content');
          return;
        }
        result = await analyzeEmailMutation.mutateAsync(emailContent);
      } else {
        if (!selectedFile) {
          setError('Please select a PDF file');
          return;
        }
        result = await analyzePdfMutation.mutateAsync(selectedFile);
      }

      setAnalysisResult(result);
      setEditedResult(result);
      setCurrentStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze');
    }
  };

  const handleCreateExpense = async () => {
    if (!editedResult) return;

    const expenseData: CreateExpenseData = {
      categoryId: editedResult.categoryId,
      amount: editedResult.amount,
      description: editedResult.description,
      date: editedResult.date,
    };

    try {
      await createExpenseMutation.mutateAsync(expenseData);
      setCurrentStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create expense');
    }
  };

  const handleStartOver = () => {
    setCurrentStep('input');
    setEmailContent('');
    setSelectedFile(null);
    setAnalysisResult(null);
    setEditedResult(null);
    setIsEditing(false);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Upload Receipt</h1>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-center">
          {[
            { key: 'input', label: 'Upload', icon: Upload },
            { key: 'preview', label: 'Preview', icon: Pencil },
            { key: 'success', label: 'Done', icon: Check },
          ].map((step, index, arr) => {
            const stepIndex = arr.findIndex((s) => s.key === currentStep);
            const isComplete = index < stepIndex;
            const isCurrent = step.key === currentStep;
            const Icon = step.icon;

            return (
              <div key={step.key} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    isComplete || isCurrent
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isComplete ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <span
                  className={`ml-2 text-sm font-medium ${
                    isComplete || isCurrent ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  {step.label}
                </span>
                {index < arr.length - 1 && <div className="mx-4 h-0.5 w-16 bg-gray-200" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {currentStep === 'input' && (
          <InputStep
            inputMode={inputMode}
            onModeChange={setInputMode}
            emailContent={emailContent}
            onEmailChange={setEmailContent}
            selectedFile={selectedFile}
            onFileChange={setSelectedFile}
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
          />
        )}

        {currentStep === 'preview' && editedResult && (
          <PreviewStep
            result={editedResult}
            isEditing={isEditing}
            categories={categories || []}
            onEdit={() => setIsEditing(true)}
            onSaveEdit={() => setIsEditing(false)}
            onCancelEdit={() => {
              setEditedResult(analysisResult);
              setIsEditing(false);
            }}
            onUpdateResult={(updates) =>
              setEditedResult((prev) => (prev ? { ...prev, ...updates } : null))
            }
            onCreateExpense={handleCreateExpense}
            onBack={handleStartOver}
            isCreating={createExpenseMutation.isPending}
          />
        )}

        {currentStep === 'success' && (
          <SuccessStep
            onViewExpenses={() => navigate('/expenses')}
            onAddAnother={handleStartOver}
          />
        )}
      </div>
    </div>
  );
}

// Input Step Component
interface InputStepProps {
  inputMode: InputMode;
  onModeChange: (mode: InputMode) => void;
  emailContent: string;
  onEmailChange: (content: string) => void;
  selectedFile: File | null;
  onFileChange: (file: File | null) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

function InputStep({
  inputMode,
  onModeChange,
  emailContent,
  onEmailChange,
  selectedFile,
  onFileChange,
  onAnalyze,
  isAnalyzing,
}: InputStepProps) {
  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 mb-4">Upload Receipt</h2>
      <p className="text-sm text-gray-500 mb-6">
        Paste email text or upload a PDF receipt. AI will extract the expense details automatically.
      </p>

      {/* Mode Toggle */}
      <div className="flex space-x-2 mb-6">
        <button
          onClick={() => onModeChange('email')}
          className={`flex-1 flex items-center justify-center px-4 py-3 rounded-lg border-2 transition-colors ${
            inputMode === 'email'
              ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
              : 'border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          <Mail className="w-5 h-5 mr-2" />
          Email Text
        </button>
        <button
          onClick={() => onModeChange('pdf')}
          className={`flex-1 flex items-center justify-center px-4 py-3 rounded-lg border-2 transition-colors ${
            inputMode === 'pdf'
              ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
              : 'border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          <FileText className="w-5 h-5 mr-2" />
          PDF Receipt
        </button>
      </div>

      {/* Input Area */}
      {inputMode === 'email' ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Paste email content
          </label>
          <textarea
            value={emailContent}
            onChange={(e) => onEmailChange(e.target.value)}
            rows={10}
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-3"
            placeholder="Paste the email content here...

Example:
Thank you for your order!

Order #12345
Date: January 15, 2024

Item: Coffee Maker
Price: $49.99

Subtotal: $49.99
Tax: $4.25
Total: $54.24

Thank you for shopping with us!"
          />
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload PDF receipt
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            {selectedFile ? (
              <div>
                <FileText className="mx-auto h-12 w-12 text-indigo-500" />
                <p className="mt-2 text-sm font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
                <button
                  onClick={() => onFileChange(null)}
                  className="mt-2 text-sm text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  Drag and drop a PDF file, or click to browse
                </p>
                <label className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                  Select PDF
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => onFileChange(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analyze Button */}
      <div className="mt-6">
        <button
          onClick={onAnalyze}
          disabled={isAnalyzing || (inputMode === 'email' ? !emailContent.trim() : !selectedFile)}
          className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? (
            <>
              <Sparkles className="w-5 h-5 mr-2 animate-pulse" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Analyze with AI
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Preview Step Component
interface PreviewStepProps {
  result: ReceiptAnalysisResult;
  isEditing: boolean;
  categories: { id: number; name: string }[];
  onEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onUpdateResult: (updates: Partial<ReceiptAnalysisResult>) => void;
  onCreateExpense: () => void;
  onBack: () => void;
  isCreating: boolean;
}

function PreviewStep({
  result,
  isEditing,
  categories,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onUpdateResult,
  onCreateExpense,
  onBack,
  isCreating,
}: PreviewStepProps) {
  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 mb-4">Review Extracted Data</h2>
      <p className="text-sm text-gray-500 mb-6">
        Review the extracted expense details. You can edit any field before saving.
      </p>

      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
        {isEditing ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Merchant</label>
              <input
                type="text"
                value={result.merchant}
                onChange={(e) => onUpdateResult({ merchant: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Amount</label>
              <input
                type="number"
                step="0.01"
                value={result.amount}
                onChange={(e) => onUpdateResult({ amount: parseFloat(e.target.value) || 0 })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                value={result.date}
                onChange={(e) => onUpdateResult({ date: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <input
                type="text"
                value={result.description}
                onChange={(e) => onUpdateResult({ description: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                value={result.categoryId}
                onChange={(e) => {
                  const cat = categories.find((c) => c.id === parseInt(e.target.value));
                  onUpdateResult({
                    categoryId: parseInt(e.target.value),
                    categoryName: cat?.name || result.categoryName,
                  });
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex space-x-2 pt-2">
              <button
                onClick={onSaveEdit}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-2" />
                Save
              </button>
              <button
                onClick={onCancelEdit}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Merchant</span>
              <span className="text-sm font-medium text-gray-900">{result.merchant}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Amount</span>
              <span className="text-sm font-medium text-gray-900">${result.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Date</span>
              <span className="text-sm font-medium text-gray-900">{result.date}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Description</span>
              <span className="text-sm font-medium text-gray-900">{result.description}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Category</span>
              <span className="text-sm font-medium text-gray-900">{result.categoryName}</span>
            </div>
            <div className="pt-2">
              <button
                onClick={onEdit}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </button>
            </div>
          </>
        )}
      </div>

      <div className="mt-6 flex justify-between">
        <button
          onClick={onBack}
          disabled={isEditing}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Start Over
        </button>
        <button
          onClick={onCreateExpense}
          disabled={isEditing || isCreating}
          className="inline-flex items-center px-6 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {isCreating ? (
            'Creating...'
          ) : (
            <>
              Create Expense
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Success Step Component
interface SuccessStepProps {
  onViewExpenses: () => void;
  onAddAnother: () => void;
}

function SuccessStep({ onViewExpenses, onAddAnother }: SuccessStepProps) {
  return (
    <div className="text-center py-12">
      <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
        <Check className="w-8 h-8 text-green-600" />
      </div>
      <h2 className="mt-4 text-xl font-medium text-gray-900">Expense Created!</h2>
      <p className="mt-2 text-sm text-gray-500">
        Your expense has been successfully added.
      </p>

      <div className="mt-6 space-x-4">
        <button
          onClick={onViewExpenses}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          View Expenses
          <ArrowRight className="w-5 h-5 ml-2" />
        </button>
        <button
          onClick={onAddAnother}
          className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
        >
          Add Another
        </button>
      </div>
    </div>
  );
}
