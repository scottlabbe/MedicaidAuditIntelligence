import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Footer() {
  const { toast } = useToast();

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(window.location.origin);
    toast({
      title: "Invite link copied",
      description: "Share this link to give others access to the application.",
    });
  };

  return (
    <footer className="bg-card border-t border-border mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <span className="text-sm text-muted-foreground">
              © 2024 Medicaid Audit Explorer
            </span>
            <a
              href="#"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms of Service
            </a>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Need access? Contact your administrator
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyInviteLink}
            >
              Copy Invite Link
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
}
